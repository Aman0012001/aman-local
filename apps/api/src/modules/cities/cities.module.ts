import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CitiesController } from './cities.controller';
import { Business } from '../../entities/business.entity';
import { City } from '../../entities/city.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Business, City])],
  controllers: [CitiesController],
})
export class CitiesModule {}
