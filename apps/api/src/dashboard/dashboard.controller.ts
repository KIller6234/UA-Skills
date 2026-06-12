import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@nih/auth';
import { DashboardService } from './dashboard.service';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('stats')
  getStats(@Req() req: { user: { sub: string } }, @Query('period') period = '7d') {
    return this.service.getStats(req.user.sub, period as '7d' | '30d' | 'all');
  }

  @Get('llm-stats')
  getLlmStats(@Req() req: { user: { sub: string } }) {
    return this.service.getLlmStats(req.user.sub);
  }
}
