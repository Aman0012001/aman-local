import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from '../../entities/business.entity';
import { City } from '../../entities/city.entity';

@Controller('cities')
export class CitiesController {
  constructor(
    @InjectRepository(Business)
    private businessesRepository: Repository<Business>,
    @InjectRepository(City)
    private citiesRepository: Repository<City>,
  ) {}

  @Get('popular')
  async getPopular() {
    const stats = await this.businessesRepository
      .createQueryBuilder('business')
      // Join with cities table to get dedicated metadata
      .leftJoin(
        'cities',
        'c',
        'LOWER(TRIM(c.name)) = LOWER(TRIM(business.city))',
      )
      .select('business.city', 'name')
      .addSelect('MAX(c.id)', 'id') // Use MAX or group by id
      .addSelect('MAX(c.hero_image_url)', 'imageUrl')
      .addSelect('COUNT(business.id)', 'businessCount')
      .groupBy('business.city')
      .orderBy('COUNT(business.id)', 'DESC')
      .limit(10)
      .getRawMany();

    return stats.map((stat) => ({
      id: stat.id || stat.name,
      name: stat.name,
      slug: (stat.name || '').toLowerCase().replace(/ /g, '-'),
      businessCount: parseInt(stat.businessCount),
      imageUrl:
        stat.imageUrl ||
        `https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&q=80&w=800`,
    }));
  }
}
