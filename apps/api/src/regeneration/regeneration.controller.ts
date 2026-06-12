import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@nih/auth';
import { RegenerationService } from './regeneration.service';

@UseGuards(JwtAuthGuard)
@Controller('regeneration')
export class RegenerationController {
  constructor(private readonly regen: RegenerationService) {}

  @Post()
  start(@Req() req: { user: { sub: string } }) {
    return this.regen.start(req.user.sub);
  }

  @Get('status')
  getStatus(@Req() req: { user: { sub: string } }) {
    return this.regen.getStatus(req.user.sub);
  }

  @Get('history')
  getHistory(@Req() req: { user: { sub: string } }) {
    return this.regen.getHistory(req.user.sub);
  }

  @Post('pause')
  pause(@Req() req: { user: { sub: string } }) {
    return this.regen.pause(req.user.sub);
  }
}
