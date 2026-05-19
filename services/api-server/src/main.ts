import { NestFactory } from '@nestjs/core';
import 'dotenv/config';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { json } from 'express';
import { AppModule } from './app.module.js';
import { FileLogger } from './common/logger/file-logger.js';

async function bootstrap(): Promise<void> {
  const logger = new FileLogger('api-server');
  const app = await NestFactory.create(AppModule, { logger });
  app.use(json({ limit: '8mb' }));
  const port = Number(process.env.API_PORT ?? 3001);

  app.getHttpAdapter().getInstance().get('/', (_request: unknown, response: { json: (body: unknown) => void }) => {
    response.json({
      service: '智答课堂 AI API',
      status: 'ok',
      health: '/api/health'
    });
  });
  app.setGlobalPrefix('api', {
    exclude: [{ path: '/', method: RequestMethod.GET }]
  });
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  await app.listen(port);
  logger.log(`API 服务已启动: http://localhost:${port}/api/health`);
}

void bootstrap();
