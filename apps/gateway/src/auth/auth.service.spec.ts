import { AuthService } from './auth.service';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';

describe('AuthService', () => {
  let authService: AuthService;
  let mockDb: Partial<DatabaseService>;
  let mockRedis: Partial<RedisService>;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
    };
    mockRedis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };
    authService = new AuthService(
      mockDb as DatabaseService,
      mockRedis as RedisService,
    );
  });

  it('rejects short passwords on register', async () => {
    await expect(
      authService.register('John Doe', 'john@example.com', 'short'),
    ).rejects.toThrow('Password must be at least 8 characters long');
  });

  it('rejects invalid emails on register', async () => {
    await expect(
      authService.register('John Doe', 'invalid-email', 'validpassword123'),
    ).rejects.toThrow('Valid email is required');
  });

  it('verifies valid access token correctly', async () => {
    (mockDb.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // email check
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'u-123',
            name: 'John Doe',
            email: 'john@example.com',
            role: 'CUSTOMER',
            status: 'ACTIVE',
          },
        ],
      }); // insert

    const result = await authService.register(
      'John Doe',
      'john@example.com',
      'strongpassword123',
    );
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();

    const payload = authService.verifyAccessToken(result.accessToken);
    expect(payload.sub).toBe('u-123');
    expect(payload.email).toBe('john@example.com');
    expect(payload.role).toBe('CUSTOMER');
    expect(payload.status).toBe('ACTIVE');
  });
});

