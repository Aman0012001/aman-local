import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../../entities/review.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewsRepository: Repository<Review>,
  ) {}

  async findAll(query: any): Promise<{ data: Review[], meta: any }> {
    const { rating, limit = 10 } = query;
    
    // Create query builder to include relations needed by frontend
    const qb = this.reviewsRepository.createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .leftJoinAndSelect('review.business', 'business');

    if (rating) {
      qb.andWhere('review.rating >= :rating', { rating: parseInt(rating) });
    }

    // Default to only showing verified or high-quality reviews on homepage
    // but we'll allow all for now to ensure data shows up
    
    const [data, total] = await qb
      .orderBy('review.createdAt', 'DESC')
      .take(parseInt(limit))
      .getManyAndCount();

    return { data, meta: { total } };
  }

  async findByBusiness(businessId: string): Promise<{ data: Review[], meta: any }> {
    const data = await this.reviewsRepository.find({
      where: { businessId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return { data, meta: { total: data.length } };
  }
}
