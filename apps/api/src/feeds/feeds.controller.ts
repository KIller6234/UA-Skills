import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard, type JwtPayload } from '@nih/auth';
import { FeedsService } from './feeds.service';
import { CreateFeedDto } from './dto/create-feed.dto';
import { UpdateFeedDto } from './dto/update-feed.dto';

@ApiTags('feeds')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('feeds')
export class FeedsController {
  constructor(private readonly feeds: FeedsService) {}

  @Post()
  create(@Req() req: Request & { user: JwtPayload }, @Body() dto: CreateFeedDto) {
    return this.feeds.create(req.user.sub, dto);
  }

  @Get()
  findAll(@Req() req: Request & { user: JwtPayload }) {
    return this.feeds.findAll(req.user.sub);
  }

  @Patch(':id')
  updateStatus(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') id: string,
    @Body() dto: UpdateFeedDto,
  ) {
    return this.feeds.updateStatus(req.user.sub, id, dto.status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: Request & { user: JwtPayload }, @Param('id') id: string) {
    return this.feeds.remove(req.user.sub, id);
  }

  @Post(':id/poll')
  triggerPoll(@Req() req: Request & { user: JwtPayload }, @Param('id') id: string) {
    return this.feeds.triggerPoll(req.user.sub, id);
  }
}
