import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Offer } from '../../entities/offer.entity';

@Injectable()
export class OffersService {
  constructor(
    @InjectRepository(Offer)
    private offersRepository: Repository<Offer>,
  ) {}

  async findByBusiness(businessId: string): Promise<Offer[]> {
    return this.offersRepository.find({
      where: { businessId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async search(query: any): Promise<{ data: Offer[], meta: any }> {
    const { limit = 10, placement } = query;
    const qb = this.offersRepository.createQueryBuilder('offer')
      .leftJoinAndSelect('offer.business', 'business')
      .where('offer.isActive = :isActive', { isActive: true });

    if (placement === 'homepage') {
      qb.andWhere('offer.isFeatured = :isFeatured', { isFeatured: true });
    }

    const offers = await qb
      .orderBy('offer.createdAt', 'DESC')
      .take(parseInt(limit))
      .getMany();

    return { data: offers, meta: { total: offers.length } };
  }
}
