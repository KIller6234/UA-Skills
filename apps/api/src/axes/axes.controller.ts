import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '@nih/auth';
import { AxesService } from './axes.service';

class CreateAxisDto {
  @IsString() @MaxLength(50) key!: string;
  @IsString() @MaxLength(50) label!: string;
  @IsOptional() @IsString() description?: string;
}

class UpdateAxisDto {
  @IsOptional() @IsString() @MaxLength(50) label?: string;
  @IsOptional() @IsString() description?: string;
}

class CreateAxisValueDto {
  @IsString() @MaxLength(50) value!: string;
  @IsString() @MaxLength(50) label!: string;
}

type Req = { user: { sub: string } };

@UseGuards(JwtAuthGuard)
@Controller('axes')
export class AxesController {
  constructor(private readonly service: AxesService) {}

  @Get()
  findAll(@Req() req: Req) {
    return this.service.findAll(req.user.sub);
  }

  @Post()
  create(@Req() req: Req, @Body() dto: CreateAxisDto) {
    return this.service.create(req.user.sub, dto);
  }

  @Patch(':id')
  update(@Req() req: Req, @Param('id') id: string, @Body() dto: UpdateAxisDto) {
    return this.service.update(req.user.sub, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: Req, @Param('id') id: string) {
    return this.service.remove(req.user.sub, id);
  }

  @Post(':id/values')
  addValue(@Req() req: Req, @Param('id') axisId: string, @Body() dto: CreateAxisValueDto) {
    return this.service.addValue(req.user.sub, axisId, dto);
  }

  @Delete(':id/values/:valueId')
  removeValue(@Req() req: Req, @Param('id') axisId: string, @Param('valueId') valueId: string) {
    return this.service.removeValue(req.user.sub, axisId, valueId);
  }
}
