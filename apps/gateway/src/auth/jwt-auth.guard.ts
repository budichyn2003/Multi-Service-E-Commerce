import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiError } from '../common/api-error';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Authentication token is required');
    }

    const token = authHeader.substring(7);
    const payload = this.authService.verifyAccessToken(token);

    if (payload.status !== 'ACTIVE') {
      throw ApiError.forbidden(`Account status is ${payload.status}`);
    }

    request.user = payload;
    return true;
  }
}

