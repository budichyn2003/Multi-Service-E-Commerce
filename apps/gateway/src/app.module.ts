import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { DatabaseService } from './database/database.service';
import { RedisService } from './redis/redis.service';
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth/auth.controller';
import { UserService } from './user/user.service';
import { UserController } from './user/user.controller';
import { ProxyService } from './proxy/proxy.service';
import { ProxyController } from './proxy/proxy.controller';
import { RolesGuard } from './auth/roles.guard';

@Module({
  controllers: [
    HealthController,
    AuthController,
    UserController,
    ProxyController,
  ],
  providers: [
    DatabaseService,
    RedisService,
    AuthService,
    UserService,
    ProxyService,
    RolesGuard,
  ],
})
export class AppModule {}
