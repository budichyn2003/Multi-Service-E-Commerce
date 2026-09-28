import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
  // Auth module (JWT + refresh), rate limiting, and reverse-proxy routes are
  // added here in Phases 1-3 (see README roadmap).
})
export class AppModule {}
