import { Injectable, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import { AuthService, UserPayload } from '../auth/auth.service';

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  private readonly commerceUrl: string;
  private readonly orderServiceUrl: string;
  private readonly notificationServiceUrl: string;
  private readonly aiServiceUrl: string;
  private readonly internalToken: string;

  constructor(private readonly authService: AuthService) {
    this.commerceUrl =
      process.env.COMMERCE_GO_URL || 'http://localhost:8081';
    this.orderServiceUrl =
      process.env.ORDER_SERVICE_URL || 'http://localhost:8082';
    this.notificationServiceUrl =
      process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:8083';
    this.aiServiceUrl =
      process.env.AI_SERVICE_URL || 'http://localhost:8084';
    this.internalToken =
      process.env.INTERNAL_SERVICE_TOKEN || 'dev-internal-token-change-me';
  }

  async forward(req: Request, res: Response, targetBaseUrl: string): Promise<void> {
    const requestId =
      (req.headers['x-request-id'] as string) || (req as any).requestId || '';

    // Attempt to extract JWT identity if present
    let user: UserPayload | null = null;
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        user = this.authService.verifyAccessToken(authHeader.substring(7));
      } catch {
        // Token invalid - leave user null, let endpoint guards decide
      }
    }

    // Role check for admin paths
    if (req.originalUrl.startsWith('/api/v1/admin')) {
      if (!user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required for admin access',
            requestId,
          },
        });
        return;
      }
      if (user.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin role required',
            requestId,
          },
        });
        return;
      }
    }

    // Auth check for cart & checkout
    if (
      req.originalUrl.startsWith('/api/v1/cart') ||
      req.originalUrl.startsWith('/api/v1/checkout')
    ) {
      if (!user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            requestId,
          },
        });
        return;
      }
    }

    const targetUrl = new URL(req.originalUrl, targetBaseUrl);
    const isHttps = targetUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    const headers: Record<string, string | string[] | undefined> = {
      ...req.headers,
      host: targetUrl.host,
      'x-request-id': requestId,
    };

    if (user) {
      headers['x-user-id'] = user.sub;
      headers['x-user-role'] = user.role;
    }

    // Pass internal token for internal communications
    headers['x-internal-token'] = this.internalToken;

    const proxyReq = client.request(
      targetUrl,
      {
        method: req.method,
        headers,
        timeout: 10000,
      },
      (proxyRes) => {
        res.status(proxyRes.statusCode || 500);
        for (const [key, value] of Object.entries(proxyRes.headers)) {
          if (value !== undefined) {
            res.setHeader(key, value);
          }
        }
        proxyRes.pipe(res);
      },
    );

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      if (!res.headersSent) {
        res.status(504).json({
          success: false,
          error: {
            code: 'GATEWAY_TIMEOUT',
            message: 'Downstream service timed out',
            requestId,
          },
        });
      }
    });

    proxyReq.on('error', (err) => {
      this.logger.error(`Proxy forwarding error to ${targetUrl.toString()}: ${err.message}`);
      if (!res.headersSent) {
        res.status(503).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Downstream service unavailable',
            requestId,
          },
        });
      }
    });

    if (req.body && Object.keys(req.body).length > 0) {
      const bodyData = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      proxyReq.setHeader('content-length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
      proxyReq.end();
    } else {
      req.pipe(proxyReq);
    }
  }

  getCommerceUrl(): string {
    return this.commerceUrl;
  }

  getOrderServiceUrl(): string {
    return this.orderServiceUrl;
  }

  getNotificationServiceUrl(): string {
    return this.notificationServiceUrl;
  }

  getAiServiceUrl(): string {
    return this.aiServiceUrl;
  }
}

