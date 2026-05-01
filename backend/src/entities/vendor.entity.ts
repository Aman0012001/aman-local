import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToOne,
    JoinColumn,
    OneToMany,
    Index,
} from 'typeorm';
import { Expose, Exclude } from 'class-transformer';
import { User } from './user.entity';
import { Listing } from './business.entity';
import { Subscription } from './subscription.entity';
import { ActivePlan } from './active-plan.entity';
import { Transaction } from './transaction.entity';
import { CommentReply } from './comment-reply.entity';

@Entity('vendors')
export class Vendor {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', type: 'uuid' })
    userId: string;

    @Column({ name: 'business_name', nullable: true })
    businessName: string;

    @Column({ name: 'stripe_customer_id', nullable: true })
    stripeCustomerId: string;

    @Column({ nullable: true, type: 'text' })
    bio: string;

    @Column({ name: 'business_email', nullable: true })
    businessEmail: string;

    @Column({ name: 'business_phone', length: 20, nullable: true })
    businessPhone: string;

    @Column({ name: 'business_address', nullable: true, type: 'text' })
    businessAddress: string;

    @Column({ length: 100, nullable: true })
    city: string;

    @Column({ name: 'gst_number', nullable: true, length: 15 })
    gstNumber: string;

    @Column({ name: 'ntn_number', nullable: true, length: 15 })
    ntnNumber: string;

    @Column({ length: 100, default: 'Pakistan', nullable: true })
    country: string;

    @Column({ name: 'is_verified', default: false })
    isVerified: boolean;

    @Column({ name: 'verification_documents', nullable: true, type: 'jsonb' })
    verificationDocuments: Record<string, any>;

    @Column({ name: 'business_hours', nullable: true, type: 'jsonb' })
    businessHours: Record<string, { isOpen: boolean, openTime: string, closeTime: string }>;

    @Column({ name: 'social_links', nullable: true, type: 'jsonb', default: '[]' })
    socialLinks: { platform: string, url: string }[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Relations
    @OneToOne(() => User, (user) => user.vendor)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @OneToMany(() => Listing, (listing) => listing.vendor)
    businesses: Listing[];

    @OneToMany(() => Subscription, (subscription) => subscription.vendor)
    subscriptions: Subscription[];

    @OneToMany(() => ActivePlan, (activePlan) => activePlan.vendor)
    activePlans: ActivePlan[];

    @OneToMany(() => Transaction, (transaction) => transaction.vendor)
    transactions: Transaction[];

    @OneToMany(() => CommentReply, (reply) => reply.vendor)
    replies: CommentReply[];
}
