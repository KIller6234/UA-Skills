import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';

import { WorkerAppModule } from './worker-app.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Worker');

  const app = await NestFactory.createApplicationContext(WorkerAppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Graceful shutdown
  const shutdown = async (): Promise<void> => {
    logger.log('SIGTERM received — closing workers gracefully...');
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());

  logger.log('Worker started');
}

void bootstrap();
