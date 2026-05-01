import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business, BusinessStatus } from '../../entities/business.entity';

@Injectable()
export class BusinessesService {
  constructor(
    @InjectRepository(Business)
    private businessesRepository: Repository<Business>,
  ) {}

  async findAll(
    options: any = {},
  ): Promise<{ data: Business[]; total: number; page: number; limit: number }> {
    const { limit = 10, page = 1, sort = 'createdAt' } = options;
    const [data, total] = await this.businessesRepository.findAndCount({
      where: { status: BusinessStatus.APPROVED },
      take: limit,
      skip: (page - 1) * limit,
      order: { [sort]: 'DESC' },
      relations: ['category'],
    });

    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit),
    };
  }

  async findOne(id: string): Promise<Business | null> {
    return this.businessesRepository.findOne({
      where: { id },
      relations: ['category', 'vendor'],
    });
  }

  async findBySlug(slug: string): Promise<Business | null> {
    return this.businessesRepository.findOne({
      where: { slug },
      relations: ['category', 'vendor'],
    });
  }

  async search(
    params: any,
  ): Promise<{ data: Business[]; total: number; page: number; limit: number }> {
    const {
      limit = 20,
      page = 1,
      featuredOnly,
      categorySlug,
      city,
      query,
    } = params;

    const queryBuilder = this.businessesRepository
      .createQueryBuilder('business')
      .leftJoinAndSelect('business.category', 'category')
      .where('business.status = :status', { status: BusinessStatus.APPROVED });

    if (featuredOnly === 'true' || featuredOnly === true) {
      queryBuilder.andWhere('business.isFeatured = :isFeatured', {
        isFeatured: true,
      });
    }

    if (categorySlug) {
      queryBuilder.andWhere('category.slug = :categorySlug', { categorySlug });
    }

    if (city) {
      queryBuilder.andWhere('LOWER(business.city) = LOWER(:city)', { city });
    }

    if (query) {
      queryBuilder.andWhere(
        '(LOWER(business.name) LIKE LOWER(:query) OR LOWER(business.description) LIKE LOWER(:query))',
        { query: `%${query}%` },
      );
    }

    const [data, total] = await queryBuilder
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit),
    };
  }
}
