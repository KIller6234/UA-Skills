import { IsEnum } from 'class-validator';

export class UpdateFeedDto {
  @IsEnum(['ACTIVE', 'PAUSED'])
  status!: 'ACTIVE' | 'PAUSED';
}
