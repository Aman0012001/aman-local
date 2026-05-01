import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { DemandService } from './demand.service';

@Controller('demand')
export class DemandController {
  constructor(private readonly demandService: DemandService) {}

  @Post('log')
  async logSearch(
    @Body()
    data: {
      keyword: string;
      city?: string;
      latitude?: number;
      longitude?: number;
      userId?: string;
    },
  ) {
    return this.demandService.logSearch(data);
  }

  @Get('insights')
  async getInsights(@Query('city') city?: string) {
    return this.demandService.getInsights(city);
  }

  @Get('nearby')
  async getNearbyDemand(@Query('lat') lat: number, @Query('lng') lng: number) {
    return this.demandService.getNearbyDemand(lat, lng);
  }

  @Get('heatmap')
  async getHeatmap(@Query('keyword') keyword?: string) {
    return this.demandService.getHeatmap(keyword);
  }
}
