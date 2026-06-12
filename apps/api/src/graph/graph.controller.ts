import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@nih/auth';
import { GraphService } from './graph.service';

@UseGuards(JwtAuthGuard)
@Controller('graph')
export class GraphController {
  constructor(private readonly service: GraphService) {}

  @Get()
  getGraph(
    @Req() req: { user: { sub: string } },
    @Query('period') period = '7d',
    @Query('nodeTypes') nodeTypes: 'all' | 'articles' | 'entities' = 'all',
    @Query('categoryId') categoryId?: string,
  ) {
    return this.service.buildGraph(req.user.sub, period, nodeTypes, categoryId);
  }
}
