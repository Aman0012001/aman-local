import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../../entities/category.entity';

@Injectable()
export class CategoriesService implements OnModuleInit {
  constructor(
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
  ) {}

  async onModuleInit() {
    const count = await this.categoriesRepository.count();
    if (count === 0) {
      await this.seedCategories();
    }
  }

  private async seedCategories() {
    const categories = [
      {
        name: 'Restaurants',
        slug: 'restaurants',
        iconUrl: 'Utensils',
        description: 'Find the best places to eat',
      },
      {
        name: 'Shopping',
        slug: 'shopping',
        iconUrl: 'ShoppingBag',
        description: 'Retail therapy at its finest',
      },
      {
        name: 'Services',
        slug: 'services',
        iconUrl: 'Briefcase',
        description: 'Professional services for your needs',
      },
      {
        name: 'Health & Beauty',
        slug: 'health-beauty',
        iconUrl: 'Heart',
        description: 'Wellness and self-care',
      },
      {
        name: 'Automotive',
        slug: 'automotive',
        iconUrl: 'Car',
        description: 'Car repair, sales, and more',
      },
      {
        name: 'Education',
        slug: 'education',
        iconUrl: 'School',
        description: 'Schools, tutors, and learning centers',
      },
    ];

    for (const cat of categories) {
      const newCat = this.categoriesRepository.create(cat);
      await this.categoriesRepository.save(newCat);
    }
    console.log('Categories seeded successfully');
  }

  async findAll(): Promise<Category[]> {
    return this.categoriesRepository.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC' },
    });
  }

  async getPopular(limit: number): Promise<Category[]> {
    // In a real app, this would be based on businessCount or views
    // For now, we return categories with business counts
    const categories = await this.categoriesRepository.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC' },
      take: limit,
    });

    // Mocking business counts for now
    return categories.map((cat) => ({
      ...cat,
      businessCount: Math.floor(Math.random() * 200) + 50,
    }));
  }

  async findBySlug(slug: string): Promise<Category | null> {
    return this.categoriesRepository.findOne({
      where: { slug, isActive: true },
    });
  }
  async findOne(id: string): Promise<Category | null> {
    return this.categoriesRepository.findOne({ where: { id } });
  }
}
