import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { SearchLog } from '../../entities/search-log.entity';

@Injectable()
export class DemandService {
  constructor(
    @InjectRepository(SearchLog)
    private searchLogRepository: Repository<SearchLog>,
  ) {}

  async logSearch(data: {
    keyword: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    userId?: string;
  }) {
    const log = this.searchLogRepository.create({
      ...data,
      normalizedKeyword: data.keyword.toLowerCase().trim(),
    });
    return this.searchLogRepository.save(log);
  }

  async getInsights(city?: string) {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Fetch logs for different windows
    const [logs1h, logs6h, logs24h] = await Promise.all([
      this.fetchAggregatedLogs(oneHourAgo, city),
      this.fetchAggregatedLogs(sixHoursAgo, city),
      this.fetchAggregatedLogs(twentyFourHoursAgo, city),
    ]);

    // Merge and calculate scores
    const stats = new Map<string, any>();

    const merge = (logs: any[], weight: number) => {
      logs.forEach((log) => {
        const keyword = log.normalizedKeyword;
        if (!stats.has(keyword)) {
          stats.set(keyword, {
            keyword,
            score: 0,
            count1h: 0,
            count6h: 0,
            count24h: 0,
          });
        }
        const current = stats.get(keyword);
        if (weight === 3) current.count1h = parseInt(log.cnt);
        if (weight === 2) current.count6h = parseInt(log.cnt);
        if (weight === 1) current.count24h = parseInt(log.cnt);
        current.score += parseInt(log.cnt) * weight;
      });
    };

    merge(logs1h, 3);
    merge(logs6h, 2);
    merge(logs24h, 1);

    return Array.from(stats.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((item) => ({
        ...item,
        trend: item.count1h > (item.count6h / 6) * 1.5 ? 'up' : 'stable',
        growth:
          item.count6h > 0
            ? Math.round(((item.count1h * 6) / item.count6h - 1) * 100)
            : 100,
      }));
  }

  private async fetchAggregatedLogs(since: Date, city?: string) {
    const qb = this.searchLogRepository
      .createQueryBuilder('log')
      .select('log.normalizedKeyword', 'normalizedKeyword')
      .addSelect('COUNT(*)', 'cnt')
      .where('log.createdAt >= :since', { since });

    if (city) {
      qb.andWhere('LOWER(log.city) = LOWER(:city)', { city });
    }

    return qb.groupBy('log.normalizedKeyword').getRawMany();
  }

  async getNearbyDemand(lat: number, lng: number) {
    // Mocking geo-demand for now, can be improved with spatial queries
    return this.getInsights();
  }

  async getHeatmap(keyword?: string) {
    const qb = this.searchLogRepository
      .createQueryBuilder('log')
      .select('log.latitude', 'lat')
      .addSelect('log.longitude', 'lng')
      .addSelect('COUNT(*)', 'intensity')
      .where('log.latitude IS NOT NULL AND log.longitude IS NOT NULL')
      .limit(100);

    if (keyword) {
      qb.andWhere('log.normalizedKeyword LIKE :keyword', {
        keyword: `%${keyword.toLowerCase()}%`,
      });
    }

    return qb.groupBy('log.latitude').addGroupBy('log.longitude').getRawMany();
  }
}
