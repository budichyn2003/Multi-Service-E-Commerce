import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import { ApiError } from '../common/api-error';

export interface UserPayload {
  sub: string;
  email: string;
  role: string;
  status: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessTtl: string;
  private readonly refreshTtl: string;

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {
    this.accessSecret =
      process.env.JWT_ACCESS_SECRET || 'dev-jwt-access-secret-min-32-chars-long';
    this.refreshSecret =
      process.env.JWT_REFRESH_SECRET || 'dev-jwt-refresh-secret-min-32-chars-long';
    this.accessTtl = process.env.JWT_ACCESS_TTL || '15m';
    this.refreshTtl = process.env.JWT_REFRESH_TTL || '30d';
  }

  async register(name: string, email: string, password: string) {
    const cleanEmail = email.trim().toLowerCase();
    if (!name || name.trim().length < 2) {
      throw ApiError.badRequest('Name must be at least 2 characters long');
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw ApiError.badRequest('Valid email is required');
    }
    if (!password || password.length < 8) {
      throw ApiError.badRequest('Password must be at least 8 characters long');
    }

    // Check unique email
    const existing = await this.db.query(
      'SELECT id FROM commerce.users WHERE email = $1',
      [cleanEmail],
    );
    if (existing.rowCount && existing.rowCount > 0) {
      throw ApiError.conflict('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await this.db.query(
      `INSERT INTO commerce.users (name, email, password_hash, role, status)
       VALUES ($1, $2, $3, 'CUSTOMER', 'ACTIVE')
       RETURNING id, name, email, role, status, created_at, updated_at`,
      [name.trim(), cleanEmail, passwordHash],
    );

    const user = result.rows[0];
    const tokens = this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    });

    await this.redis.set(`refresh:${tokens.refreshToken}`, user.id, 30 * 24 * 3600);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async login(email: string, password: string) {
    const cleanEmail = email.trim().toLowerCase();
    const result = await this.db.query(
      'SELECT id, name, email, password_hash, role, status FROM commerce.users WHERE email = $1',
      [cleanEmail],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const user = result.rows[0];
    if (user.status !== 'ACTIVE') {
      throw ApiError.forbidden(`Account is ${user.status.toLowerCase()}`);
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    await this.db.query(
      'UPDATE commerce.users SET last_login_at = now(), updated_at = now() WHERE id = $1',
      [user.id],
    );

    const tokens = this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    });

    await this.redis.set(`refresh:${tokens.refreshToken}`, user.id, 30 * 24 * 3600);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw ApiError.badRequest('Refresh token is required');
    }

    let payload: any;
    try {
      payload = jwt.verify(refreshToken, this.refreshSecret);
    } catch {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    // Verify token not revoked in Redis
    const storedUserId = await this.redis.get(`refresh:${refreshToken}`);
    if (storedUserId === 'revoked') {
      throw ApiError.unauthorized('Refresh token has been revoked');
    }

    const result = await this.db.query(
      'SELECT id, email, role, status FROM commerce.users WHERE id = $1',
      [payload.sub],
    );
    if (!result.rowCount || result.rowCount === 0) {
      throw ApiError.unauthorized('User not found');
    }

    const user = result.rows[0];
    if (user.status !== 'ACTIVE') {
      throw ApiError.forbidden(`Account is ${user.status.toLowerCase()}`);
    }

    const tokens = this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    });

    // Revoke old refresh token, store new
    await this.redis.del(`refresh:${refreshToken}`);
    await this.redis.set(`refresh:${tokens.refreshToken}`, user.id, 30 * 24 * 3600);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(refreshToken: string) {
    if (refreshToken) {
      await this.redis.del(`refresh:${refreshToken}`);
    }
    return { message: 'Logged out successfully' };
  }

  verifyAccessToken(token: string): UserPayload {
    try {
      return jwt.verify(token, this.accessSecret) as UserPayload;
    } catch {
      throw ApiError.unauthorized('Invalid or expired access token');
    }
  }

  private generateTokens(payload: UserPayload) {
    const accessToken = jwt.sign(payload, this.accessSecret, {
      expiresIn: this.accessTtl as any,
    });
    const refreshToken = jwt.sign(
      { sub: payload.sub, email: payload.email },
      this.refreshSecret,
      { expiresIn: this.refreshTtl as any },
    );

    return { accessToken, refreshToken };
  }
}

