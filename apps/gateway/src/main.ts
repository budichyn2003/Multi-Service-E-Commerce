import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { RequestIdMiddleware } from './request-id.middleware';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Request ID + security headers apply to every route (see API.md / SECURITY.md).
  app.use(RequestIdMiddleware.use);
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`gateway listening on :${port}`);
}

void bootstrap();
