import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { DatabaseModule } from '@nih/database';
import { AppConfigModule } from '@nih/config';

import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AppConfigModule,
    DatabaseModule,
    ThrottlerModule.forRoot([
      { name: 'auth', ttl: 60_000, limit: 5 },
      { name: 'global', ttl: 60_000, limit: 100 },
    ]),
    HealthModule,
  ],
})
export class AppModule {}
