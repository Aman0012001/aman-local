import { Controller, Get, Query, Param } from '@nestjs/common';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  async findAll(@Query() query: any) {
    return this.reviewsService.findAll(query);
  }

  @Get('business/:id')
  async findByBusiness(@Param('id') id: string) {
    return this.reviewsService.findByBusiness(id);
  }
}
