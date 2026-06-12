import { Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@nih/auth';
import { EntitiesService } from './entities.service';

type AuthReq = { user: { sub: string } };

@UseGuards(JwtAuthGuard)
@Controller('entities')
export class EntitiesController {
  constructor(private readonly service: EntitiesService) {}

  @Get(':id')
  findOne(@Req() req: AuthReq, @Param('id') id: string) {
    return this.service.findOne(req.user.sub, id);
  }

  @Get(':id/articles')
  findArticles(
    @Req() req: AuthReq,
    @Param('id') id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.service.findArticles(req.user.sub, id, page, Math.min(50, limit));
  }
}
