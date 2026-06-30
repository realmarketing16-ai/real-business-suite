import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { parseWebUrls } from './config/web-url';
import { applySecurityHeaders } from './security/headers';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.setGlobalPrefix('api');
  applySecurityHeaders(app);
  app.enableCors({ origin: parseWebUrls(process.env.WEB_URL) });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(Number(process.env.PORT ?? process.env.API_PORT ?? 4000));
}

void bootstrap();
