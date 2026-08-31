import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { resolve } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.enableCors();
  app.useStaticAssets(resolve(process.cwd(), '..', 'daily_review'), {
    prefix: '/daily_review',
  });
  app.useStaticAssets(resolve(process.cwd(), '..', 'comment_attachments'), {
    prefix: '/comment_attachments',
  });
  await app.listen(4444);
}
bootstrap();
