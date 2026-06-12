import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@nih/auth';
import { ArticlesService, type ArticlesQuery } from './articles.service';

type AuthReq = { user: { sub: string } };

@UseGuards(JwtAuthGuard)
@Controller('articles')
export class ArticlesController {
  constructor(private readonly service: ArticlesService) {}

  @Get()
  findAll(@Req() req: AuthReq, @Query() query: ArticlesQuery) {
    return this.service.findAll(req.user.sub, query);
  }

  @Get(':id')
  findOne(@Req() req: AuthReq, @Param('id') id: string) {
    return this.service.findOne(req.user.sub, id);
  }

  @Get(':id/similar')
  findSimilar(@Req() req: AuthReq, @Param('id') id: string) {
    return this.service.findSimilar(req.user.sub, id);
  }
}
