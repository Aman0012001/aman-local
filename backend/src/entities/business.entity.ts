import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
    Index,
} from 'typeorm';
import { Expose, Exclude, Type } from 'class-transformer';
import { Vendor } from './vendor.entity';
import { Category } from './category.entity';
import { BusinessHours } from './business-hours.entity';
import { BusinessAmenity } from './business-amenity.entity';
import { Review } from './review.entity';
import { Lead } from './lead.entity';
import { SavedListing } from './favorite.entity';
import { Comment } from './comment.entity';
import { Follow } from './follow.entity';

export enum BusinessStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    SUSPENDED = 'suspended',
}

@Entity('businesses')
@Index(['latitude', 'longitude'])
export class Listing {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'vendor_id', type: 'uuid' })
    vendorId: string;

    @Column({ name: 'category_id', type: 'uuid', nullable: true })
    @Index()
    categoryId: string;

    @Column({ name: 'suggested_category_name', nullable: true, type: 'text' })
    suggestedCategoryName: string;

    // Basic Info
    @Column({ name: 'name' })
    @Index()
    title: string;

    @Expose()
    get name(): string {
        return this.title;
    }

    @Expose()
    get businessName(): string {
        return this.title;
    }

    @Column({ unique: true })
    @Index()
    slug: string;

    @Column({ nullable: true, type: 'text' })
    description: string;

    @Column({ name: 'short_description', nullable: true, length: 500 })
    shortDescription: string;

    // Contact
    @Column({ nullable: true })
    email: string;

    @Column({ length: 20 })
    phone: string;

    @Column({ nullable: true, length: 20 })
    whatsapp: string;

    @Column({ nullable: true })
    website: string;

    // Location
    @Column({ type: 'text' })
    address: string;

    @Column({ length: 100, nullable: true })
    @Index()
    city: string;

    @Column({ length: 100, nullable: true })
    state: string;

    @Column({ length: 100, default: 'Pakistan', nullable: true })
    country: string;

    @Column({ length: 10, nullable: true })
    @Index()
    pincode: string;

    @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
    latitude: number;

    @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
    longitude: number;

    /*
    @Column({
        type: 'geography',
        spatialFeatureType: 'Point',
        srid: 4326,
        nullable: true,
    })
    @Index({ spatial: true })
    location: string;
    */

    // Media
    @Column({ name: 'logo_url', nullable: true, type: 'text' })
    logoUrl: string;

    @Column({ name: 'cover_image_url', nullable: true, type: 'text' })
    coverImageUrl: string;

    @Column({ type: 'jsonb', default: '[]' })
    images: string[];

    @Column({ type: 'jsonb', default: '[]' })
    videos: string[];

    // Business Details
    @Column({ name: 'year_established', nullable: true })
    yearEstablished: number;

    @Column({ name: 'employee_count', nullable: true, length: 50 })
    employeeCount: string;

    @Column({ name: 'price_range', nullable: true, length: 10 })
    priceRange: string;

    // Status & Ratings
    @Column({
        type: 'enum',
        enum: BusinessStatus,
        default: BusinessStatus.PENDING,
    })
    @Index()
    status: BusinessStatus;

    @Column({ name: 'is_verified', default: false })
    isVerified: boolean;

    @Column({ name: 'is_featured', default: false })
    @Index()
    isFeatured: boolean;

    @Column({ name: 'is_sponsored', default: false })
    @Index()
    isSponsored: boolean;

    @Column({ name: 'recent_until', nullable: true, type: 'timestamp' })
    @Index()
    recentUntil: Date;

    @Column({ name: 'average_rating', type: 'decimal', precision: 3, scale: 2, default: 0 })
    @Index()
    averageRating: number;

    @Column({ name: 'total_reviews', default: 0 })
    totalReviews: number;

    @Column({ name: 'total_views', default: 0 })
    totalViews: number;

    @Column({ name: 'total_leads', default: 0 })
    totalLeads: number;

    @Column({ name: 'followers_count', default: 0 })
    followersCount: number;

    // SEO
    @Column({ name: 'meta_title', nullable: true })
    metaTitle: string;

    @Column({ name: 'meta_description', nullable: true, type: 'text' })
    metaDescription: string;

    @Column({ name: 'meta_keywords', nullable: true, type: 'text' })
    metaKeywords: string;

    @Column({ name: 'search_keywords', type: 'jsonb', default: '[]' })
    searchKeywords: string[];

    // Approval
    @Column({ name: 'approved_at', nullable: true, type: 'timestamp' })
    approvedAt: Date;

    @Column({ name: 'rejected_at', nullable: true, type: 'timestamp' })
    rejectedAt: Date;

    @Column({ name: 'rejection_reason', nullable: true, type: 'text' })
    rejectionReason: string;

    // Offer / Promo
    @Column({ name: 'has_offer', default: false })
    hasOffer: boolean;

    @Column({ name: 'offer_title', nullable: true, length: 150 })
    offerTitle: string;

    @Column({ name: 'offer_description', nullable: true, type: 'text' })
    offerDescription: string;

    @Column({ name: 'offer_badge', nullable: true, length: 60 })
    offerBadge: string;

    @Column({ name: 'offer_expires_at', nullable: true, type: 'timestamp' })
    offerExpiresAt: Date;

    @Column({ name: 'offer_banner_url', nullable: true, type: 'text' })
    offerBannerUrl: string;

    @Expose()
    @Type(() => Object)
    @Column({ type: 'jsonb', default: '[]' })
    faqs: { question: string; answer: string }[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Relations
    @ManyToOne(() => Vendor, (vendor) => vendor.businesses)
    @JoinColumn({ name: 'vendor_id' })
    vendor: Vendor;

    @ManyToOne(() => Category, (category) => category.businesses)
    @JoinColumn({ name: 'category_id' })
    category: Category;

    @OneToMany(() => BusinessHours, (hours) => hours.business)
    businessHours: BusinessHours[];

    @Exclude()
    @OneToMany(() => BusinessAmenity, (amenity) => amenity.business)
    businessAmenities: BusinessAmenity[];

    @Exclude()
    @OneToMany(() => Review, (review) => review.business)
    reviews: Review[];

    @Exclude()
    @OneToMany(() => Lead, (lead) => lead.business)
    leads: Lead[];

    @Exclude()
    @OneToMany(() => SavedListing, (savedListing) => savedListing.business)
    savedListings: SavedListing[];

    @Exclude()
    @OneToMany(() => Comment, (comment) => comment.business)
    comments: Comment[];

    @OneToMany(() => Follow, (follow) => follow.business)
    follows: Follow[];
}
