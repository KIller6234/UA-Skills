import { Controller, Get, Post, Patch, Delete, Param, Query, Req, Body, ParseIntPipe, DefaultValuePipe, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@nih/auth';
import { DigestsService } from './digests.service';

@UseGuards(JwtAuthGuard)
@Controller('digests')
export class DigestsController {
  constructor(private readonly digests: DigestsService) {}

  @Get()
  findAll(
    @Req() req: { user: { sub: string } },
    @Query('period') period?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
  ) {
    return this.digests.findAll(req.user.sub, period, page, Math.min(50, limit!));
  }

  @Post()
  trigger(@Req() req: { user: { sub: string } }, @Query('period') period = 'day') {
    return this.digests.trigger(req.user.sub, period);
  }

  @Get('settings')
  getSettings(@Req() req: { user: { sub: string } }) {
    return this.digests.getSettings(req.user.sub);
  }

  @Patch('settings')
  updateSettings(
    @Req() req: { user: { sub: string } },
    @Body() body: { digestHour?: number; digestEmailEnabled?: boolean },
  ) {
    return this.digests.updateSettings(req.user.sub, body);
  }

  @Get(':id')
  findOne(@Req() req: { user: { sub: string } }, @Param('id') id: string) {
    return this.digests.findOne(req.user.sub, id);
  }

  @Delete(':id')
  remove(@Req() req: { user: { sub: string } }, @Param('id') id: string) {
    return this.digests.remove(req.user.sub, id);
  }
}
