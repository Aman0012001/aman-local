import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToOne,
    OneToMany,
    Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Vendor } from './vendor.entity';
import { Review } from './review.entity';
import { Lead } from './lead.entity';
import { SavedListing } from './favorite.entity';
import { Notification } from './notification.entity';
import { Comment } from './comment.entity';
import { Follow } from './follow.entity';
import { Affiliate } from './affiliate.entity';
import { ReviewReply } from './review-reply.entity';

export enum UserRole {
    USER = 'user',
    VENDOR = 'vendor',
    ADMIN = 'admin',
    SUPERADMIN = 'superadmin',
}

/**
 * Tracks how this account was originally created and which auth providers
 * are currently linked to it.
 *
 * - 'local'  → signed up with email + password
 * - 'google' → signed up via Google OAuth (no password set)
 * - 'both'   → started as local, later linked Google (or vice-versa)
 */
export enum AuthProvider {
    LOCAL = 'local',
    GOOGLE = 'google',
    BOTH = 'both',
}

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /**
     * Nullable and excluded from default SELECT results.
     * Google-only users will have this as NULL — that is intentional.
     */
    @Column({ nullable: true, select: false })
    password: string;

    @Column({ unique: true })
    email: string;

    @Column({ nullable: true, length: 20 })
    phone: string;

    @Column({ name: 'full_name' })
    fullName: string;

    @Column({ name: 'avatar_url', nullable: true, type: 'text' })
    avatarUrl: string;

    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.USER,
    })
    role: UserRole;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    @Column({ name: 'is_email_verified', default: false })
    isEmailVerified: boolean;

    @Column({ name: 'is_phone_verified', default: false })
    isPhoneVerified: boolean;

    @Column({ name: 'is_online', default: false })
    @Index()
    isOnline: boolean;

    @Column({ nullable: true, length: 100 })
    city: string;

    @Column({ nullable: true, length: 100 })
    state: string;

    @Column({ nullable: true, length: 100, default: 'Pakistan' })
    country: string;

    /** The Google `sub` identifier.  Unique but nullable so local-only users work. */
    @Column({ name: 'google_id', nullable: true, unique: true })
    googleId: string;

    /**
     * Auth provider tracking.  Stored as varchar(10) so existing DB rows with
     * the string values 'local' / 'google' are compatible without a migration.
     */
    @Column({
        name: 'provider',
        type: 'varchar',
        length: 10,
        nullable: true,
        default: AuthProvider.LOCAL,
    })
    provider: AuthProvider;

    @Column({ name: 'device_token', nullable: true, type: 'text' })
    deviceToken: string;

    @Column({ name: 'push_subscriptions', nullable: true, type: 'jsonb', default: '[]' })
    pushSubscriptions: any[];

    @Column({ name: 'last_login_at', nullable: true, type: 'timestamp' })
    lastLoginAt: Date;

    @Column({ name: 'last_logout_at', nullable: true, type: 'timestamp' })
    lastLogoutAt: Date;

    @Column({ name: 'last_active_at', nullable: true, type: 'timestamp' })
    lastActiveAt: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @Column({ name: 'deletion_scheduled_at', nullable: true, type: 'timestamp' })
    @Index()
    deletionScheduledAt: Date;

    @Column({ name: 'trust_score', type: 'int', default: 100 })
    trustScore: number;

    // ── Relations ─────────────────────────────────────────────────────────────

    @OneToOne(() => Vendor, (vendor) => vendor.user)
    vendor: Vendor;

    @Exclude()
    @OneToMany(() => Review, (review) => review.user)
    reviews: Review[];

    @Exclude()
    @OneToMany(() => Lead, (lead) => lead.user)
    leads: Lead[];

    @Exclude()
    @OneToMany(() => SavedListing, (savedListing) => savedListing.user)
    savedListings: SavedListing[];

    @Exclude()
    @OneToMany(() => Notification, (notification) => notification.user)
    notifications: Notification[];

    @Exclude()
    @OneToMany(() => Comment, (comment) => comment.user)
    comments: Comment[];

    @Exclude()
    @OneToMany(() => Follow, (follow) => follow.user)
    follows: Follow[];

    @OneToOne(() => Affiliate, (affiliate) => affiliate.user)
    affiliate: Affiliate;

    @Exclude()
    @OneToMany(() => ReviewReply, (reply) => reply.user)
    reviewReplies: ReviewReply[];
}
