import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DemandController } from './demand.controller';
import { DemandService } from './demand.service';
import { SearchLog } from '../../entities/search-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SearchLog])],
  controllers: [DemandController],
  providers: [DemandService],
  exports: [DemandService],
})
export class DemandModule {}
