import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { SubscriptionPlan, SubscriptionPlanType } from '../../entities/subscription-plan.entity';

@Injectable()
export class SubscriptionsSeederService implements OnModuleInit {
    private readonly logger = new Logger(SubscriptionsSeederService.name);

    constructor(
        @InjectRepository(SubscriptionPlan)
        private planRepository: Repository<SubscriptionPlan>,
        private configService: ConfigService,
    ) { }

    async onModuleInit() {
        const val = this.configService.get('SEED_DATABASE');
        const shouldSeed = String(val) === 'true';
        if (shouldSeed) {
            await this.seedPlans();
        }
    }

    async seedPlans() {
        this.logger.log('🌱 Starting subscription plans seeding...');

        const plans = [
            {
                id: '00000000-0000-0000-0000-000000000001',
                name: 'Free',
                planType: SubscriptionPlanType.FREE,
                description: 'Get your business online with a basic profile. No credit card required.',
                price: 0,
                billingCycle: 'monthly',
                dashboardFeatures: {
                    showListings: true,       // can see their 1 listing
                    canAddListing: true,       // can add 1 listing (enforced by maxListings)
                    showSaved: false,
                    showFollowing: false,
                    showQueries: false,
                    showLeads: false,
                    showOffers: false,
                    showReviews: false,
                    showAnalytics: false,
                    showChat: false,
                    showDemand: false,
                    showBroadcast: false,
                    maxKeywords: 0,
                },
                isFeatured: false,
                stripePriceId: null,
                maxListings: 1,
                isActive: true,
            },
        ];

        // Seeding / Updating
        for (const planData of plans) {
            const existing = await this.planRepository.findOne({
                where: { id: planData.id }
            });

            if (existing) {
                this.logger.log(`Updating dashboard features for plan: ${planData.name} (preserving existing price/name)`);
                // Destructure to exclude fields that only the Admin should control in live DB
                const { price, name, id, ...configOnly } = planData;
                await this.planRepository.update(existing.id, configOnly as any);
            } else {
                this.logger.log(`Creating new plan: ${planData.name} with price ${planData.price}`);
                const plan = this.planRepository.create(planData as any);
                await this.planRepository.save(plan);
            }
        }

        // Deactivate others
        const activeIds = plans.map(p => p.id);
        await this.planRepository.update(
            { id: Not(In(activeIds)) },
            { isActive: false }
        );

        this.logger.log('✅ Subscription plans seeding completed.');
    }
}
