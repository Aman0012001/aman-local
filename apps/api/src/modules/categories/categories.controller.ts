import { Controller, Get, Param, Query } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Category } from '../../entities/category.entity';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async findAll(): Promise<Category[]> {
    return this.categoriesService.findAll();
  }

  @Get('popular')
  async getPopular(@Query('limit') limit: number = 8): Promise<Category[]> {
    return this.categoriesService.getPopular(limit);
  }

  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string): Promise<Category | null> {
    return this.categoriesService.findBySlug(slug);
  }
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Category | null> {
    return this.categoriesService.findOne(id);
  }
}
