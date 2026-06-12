import { Module } from '@nestjs/common';
import { AxesController } from './axes.controller';
import { AxesService } from './axes.service';

@Module({ controllers: [AxesController], providers: [AxesService] })
export class AxesModule {}
