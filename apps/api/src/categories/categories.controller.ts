import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '@nih/auth';
import { CategoriesService } from './categories.service';

class CreateCategoryDto {
  @IsString() @MaxLength(50) name!: string;
  @IsOptional() @IsString() color?: string;
}

class UpdateCategoryDto {
  @IsOptional() @IsString() @MaxLength(50) name?: string;
  @IsOptional() @IsString() color?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Get()
  findAll(@Req() req: { user: { sub: string } }) {
    return this.service.findAll(req.user.sub);
  }

  @Post()
  create(@Req() req: { user: { sub: string } }, @Body() dto: CreateCategoryDto) {
    return this.service.create(req.user.sub, dto);
  }

  @Patch(':id')
  update(@Req() req: { user: { sub: string } }, @Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.service.update(req.user.sub, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: { user: { sub: string } }, @Param('id') id: string) {
    return this.service.remove(req.user.sub, id);
  }
}
