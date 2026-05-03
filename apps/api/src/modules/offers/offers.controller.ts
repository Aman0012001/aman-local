import { Controller, Get, Param, Query } from '@nestjs/common';
import { OffersService } from './offers.service';

@Controller('offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Get('public/search')
  async search(@Query() query: any) {
    return this.offersService.search(query);
  }

  @Get('business/:id/offers')
  async findByBusiness(@Param('id') id: string) {
    return this.offersService.findByBusiness(id);
  }
}
