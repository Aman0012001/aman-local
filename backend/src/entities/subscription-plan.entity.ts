import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';
import { Subscription } from './subscription.entity';

export enum SubscriptionPlanType {
    FREE = 'free',
    BASIC = 'basic',
    PREMIUM = 'premium',
    ENTERPRISE = 'enterprise',
}

@Entity('subscription_plans')
export class SubscriptionPlan {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 100 })
    name: string;

    @Column({
        name: 'plan_type',
        type: 'enum',
        enum: SubscriptionPlanType,
    })
    planType: SubscriptionPlanType;

    @Column({ nullable: true, type: 'text' })
    description: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    price: number;

    @Column({ name: 'billing_cycle', length: 20, default: 'monthly' })
    billingCycle: string;

    @Column({ name: 'stripe_price_id', nullable: true })
    stripePriceId: string;

    @Column({ name: 'max_listings', default: 1 })
    maxListings: number;

    @Column({ name: 'is_featured', default: false })
    isFeatured: boolean;

    @Column({ name: 'dashboard_features', type: 'jsonb', default: {} })
    dashboardFeatures: any;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Relations
    @OneToMany(() => Subscription, (subscription) => subscription.plan)
    subscriptions: Subscription[];
}
