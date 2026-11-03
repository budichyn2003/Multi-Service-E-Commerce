import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { RequestIdMiddleware } from './request-id.middleware';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Request ID applies to every route (see API.md / SECURITY.md).
  app.use(RequestIdMiddleware.use);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors();
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? (process.env.GATEWAY_PORT || 3000));
  await app.listen(port);
  console.log(`gateway listening on :${port}`);
}

void bootstrap();
