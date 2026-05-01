import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, Brackets, Like, MoreThan } from 'typeorm';
import { Listing, BusinessStatus } from '../../entities/business.entity';
import { BusinessHours, DayOfWeek } from '../../entities/business-hours.entity';
import { BusinessAmenity } from '../../entities/business-amenity.entity';
import { Amenity } from '../../entities/amenity.entity';
import { Category, CategoryStatus } from '../../entities/category.entity';
import { Vendor } from '../../entities/vendor.entity';
import { User, UserRole } from '../../entities/user.entity';
import { ActivePlan, ActivePlanStatus } from '../../entities/active-plan.entity';
import { Subscription, SubscriptionStatus } from '../../entities/subscription.entity';
import { SubscriptionPlan } from '../../entities/subscription-plan.entity';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { SearchBusinessDto, SearchSortBy } from './dto/search-business.dto';
import {
    createPaginatedResponse,
    calculateSkip,
} from '../../common/utils/pagination.util';
import { generateSlug, generateUniqueSlug } from '../../common/utils/slug.util';
import { calculateDistance } from '../../common/utils/geolocation.util';
import { NotificationsService } from '../notifications/notifications.service';
import { SearchService } from '../search/search.service';
import { DemandService } from '../demand/demand.service';

@Injectable()
export class BusinessesService {
    constructor(
        @InjectRepository(Listing)
        private listingRepository: Repository<Listing>,
        @InjectRepository(BusinessHours)
        private businessHoursRepository: Repository<BusinessHours>,
        @InjectRepository(BusinessAmenity)
        private businessAmenityRepository: Repository<BusinessAmenity>,
        @InjectRepository(Amenity)
        private amenityRepository: Repository<Amenity>,
        @InjectRepository(Category)
        private categoryRepository: Repository<Category>,
        @InjectRepository(Vendor)
        private vendorRepository: Repository<Vendor>,
        @InjectRepository(ActivePlan)
        private activePlanRepository: Repository<ActivePlan>,
        @InjectRepository(Subscription)
        private subscriptionRepository: Repository<Subscription>,
        @InjectRepository(SubscriptionPlan)
        private subscriptionPlanRepository: Repository<SubscriptionPlan>,
        private notificationsService: NotificationsService,
        private searchService: SearchService,
        private demandService: DemandService,
    ) { }

    /**
     * Create a new listing
     */
    async create(createBusinessDto: CreateBusinessDto, user: User): Promise<Listing> {
        // Find or create vendor profile for the user
        let vendor = await this.vendorRepository.findOne({
            where: { userId: user.id },
            relations: ['subscriptions'],
        });

        if (!vendor) {
            // Only allow if user is a vendor, admin or superadmin
            if (user.role === UserRole.USER) {
                throw new ForbiddenException('Only vendors and administrators can create listings');
            }

            // Create a default vendor profile if it doesn't exist (for admins/superadmins)
            vendor = this.vendorRepository.create({
                userId: user.id,
                businessName: `${user.fullName}'s Business`,
                businessPhone: user.phone,
                isVerified: true,
            });
            vendor = await this.vendorRepository.save(vendor);
        }

        // Verify category exists or handle suggestion
        let category = null;
        if (createBusinessDto.categoryId) {
            category = await this.categoryRepository.findOne({
                where: { id: createBusinessDto.categoryId },
            });

            if (!category) {
                throw new NotFoundException('Category not found');
            }

            if (category.status !== CategoryStatus.ACTIVE) {
                throw new BadRequestException('Invalid category: selected category is disabled');
            }
        } else if (!createBusinessDto.suggestedCategoryName) {
            throw new BadRequestException('Either categoryId or suggestedCategoryName must be provided');
        }

        // Generate unique slug
        const slug = generateUniqueSlug(createBusinessDto.title);

        // Sanitize offerExpiresAt to prevent invalid date errors
        let sanitizedExpiresAt = createBusinessDto.offerExpiresAt;
        if (
            sanitizedExpiresAt === '' || 
            sanitizedExpiresAt === null || 
            (typeof sanitizedExpiresAt === 'string' && (sanitizedExpiresAt.includes('NaN') || sanitizedExpiresAt.includes('Invalid')))
        ) {
            sanitizedExpiresAt = null as any;
        }

        // NEW: Check for ANY active featured/boosted plan (Unified Subscription Engine)
        const [activeSub, activeNewPlan, referralPlan] = await Promise.all([
            this.subscriptionRepository.findOne({
                where: { vendorId: vendor.id, status: SubscriptionStatus.ACTIVE, endDate: MoreThan(new Date()) },
                relations: ['plan']
            }),
            this.activePlanRepository.findOne({
                where: { vendorId: vendor.id, status: ActivePlanStatus.ACTIVE, endDate: MoreThan(new Date()) },
                relations: ['plan']
            }),
            // Check if their vendor profile is verified or they have an active referral plan
            this.activePlanRepository.findOne({
                where: [
                    { vendorId: vendor.id, status: ActivePlanStatus.ACTIVE, transactionId: Like('%REFERRAL%') },
                    { vendorId: vendor.id, status: ActivePlanStatus.ACTIVE, transactionId: 'MANUAL_REWARD_REPAIR' }
                ]
            })
        ]);

        const hasFeaturedSub = (activeSub?.plan?.isFeatured) || ((activeNewPlan?.plan?.features as any)?.isFeatured);
        const hasBoostedSub = !!referralPlan || ((activeNewPlan?.plan?.features as any)?.top_ranking);

        const shouldAutoApprove = vendor.isVerified || !!referralPlan || hasFeaturedSub;

        // Create listing
        const listing = this.listingRepository.create({
            ...createBusinessDto,
            offerExpiresAt: sanitizedExpiresAt,
            vendorId: vendor.id,
            slug,
            status: shouldAutoApprove ? BusinessStatus.APPROVED : BusinessStatus.PENDING,
            isVerified: vendor.isVerified || !!referralPlan,
            isFeatured: hasFeaturedSub || !!referralPlan,
            isSponsored: hasBoostedSub,
            approvedAt: shouldAutoApprove ? new Date() : null,
        });

        const savedListing = await this.listingRepository.save(listing);

        // Create business hours if provided
        if (createBusinessDto.businessHours?.length) {
            const hours = createBusinessDto.businessHours.map((hour) =>
                this.businessHoursRepository.create({
                    businessId: savedListing.id,
                    ...hour,
                }),
            );
            await this.businessHoursRepository.save(hours);
        }

        // Create business amenities if provided
        if (createBusinessDto.amenityIds?.length) {
            const amenities = createBusinessDto.amenityIds.map((amenityId) =>
                this.businessAmenityRepository.create({
                    businessId: savedListing.id,
                    amenityId,
                }),
            );
            await this.businessAmenityRepository.save(amenities);
        }

        // Return fully populated listing
        const result = await this.findOne(savedListing.id, user);

        // Notify Admin if there's a suggested category
        if (createBusinessDto.suggestedCategoryName) {
            this.notificationsService.notifyAdmin({
                title: '🆕 New Category Suggestion',
                message: `Vendor "${vendor.businessName}" suggested a new category: "${createBusinessDto.suggestedCategoryName}" for their listing "${result.title}".`,
                type: 'system',
                data: { businessId: result.id, suggestedCategory: createBusinessDto.suggestedCategoryName },
            }).catch(() => {/* non-blocking */ });
        }

        // Index in Elasticsearch (async, don't wait to complete to return response)
        this.searchService.indexBusiness(result).catch(err => console.error('ES Index Error:', err));

        return result;
    }

    /**
     * Search businesses with filters and geo-location
     */
    async search(searchDto: SearchBusinessDto) {
        const {
            page = 1,
            limit = 20,
            latitude,
            longitude,
            radius,
            city,
            categoryId,
            categorySlug,
            minRating,
            priceRange,
            featuredOnly,
            verifiedOnly,
            openNow,
            sortBy,
            userId,
        } = searchDto;
        const skip = calculateSkip(page, limit);

        // Async Search Logging
        if (latitude && longitude) {
            this.demandService.logSearch({
                keyword: searchDto.query || '',
                city: searchDto.city,
                categorySlug: searchDto.categorySlug,
                latitude,
                longitude,
                userId,
            }).catch(err => console.error('[BusinessesService] Analytics log error:', err));
        }

        // Elasticsearch Integration: Get IDs for high-relevance results
        let esIds: string[] | null = null;
        if (searchDto.query && this.searchService.isAvailable()) {
            try {
                esIds = await this.searchService.searchIds(
                    searchDto.query,
                    searchDto.city,
                    searchDto.categorySlug,
                    100, // Fetch top 100 for filtering
                );
            } catch (err) {
                console.error('[BusinessesService] Elasticsearch search error:', err);
            }
        }

        const queryBuilder = this.listingRepository
            .createQueryBuilder('listing')
            .leftJoinAndSelect('listing.category', 'category')
            .leftJoinAndSelect('listing.vendor', 'vendor')
            .leftJoinAndSelect('vendor.user', 'user')
            .leftJoinAndSelect('listing.businessHours', 'businessHours')
            .leftJoinAndSelect('listing.businessAmenities', 'businessAmenities')
            .leftJoinAndSelect('businessAmenities.amenity', 'amenity')
            .where('listing.status = :status', { status: BusinessStatus.APPROVED })
            .andWhere('(category.id IS NULL OR category.status = :catStatus)', { catStatus: CategoryStatus.ACTIVE });

        // Apply Search Results from Elasticsearch or fallback to ILIKE
        if (esIds && esIds.length > 0) {
            queryBuilder.andWhere('listing.id IN (:...esIds)', { esIds });
            // If relevance sorting requested, use ES order
            if (sortBy === SearchSortBy.RELEVANCE) {
                queryBuilder.orderBy(`array_position(ARRAY['${esIds.join("','")}']::uuid[], listing.id)`, 'ASC');
            }
        } else if (searchDto.query) {
            // Text search fallback — matches title, description and vendor/admin-added search keywords
            const searchTerms = searchDto.query.toLowerCase().split(' ').filter(term => term.length > 0);
            queryBuilder.andWhere(new Brackets((qb) => {
                for (let i = 0; i < searchTerms.length; i++) {
                    const term = searchTerms[i];
                    qb.andWhere(
                        new Brackets((innerQb) => {
                            innerQb.where(`"listing"."name" ILIKE :term${i}`)
                                .orWhere(`"listing"."description" ILIKE :term${i}`)
                                .orWhere(`"listing"."meta_keywords" ILIKE :term${i}`)
                                .orWhere(`"listing"."search_keywords"::text ILIKE :term${i}`)
                                .orWhere(`"vendor"."business_name" ILIKE :term${i}`);
                        }),
                        { [`term${i}`]: `%${term}%` }
                    );
                }
            }));
        }

        // Category filter
        if (searchDto.categoryId) {
            queryBuilder.andWhere('category.id = :categoryId', {
                categoryId: searchDto.categoryId,
            });
        }

        if (searchDto.categorySlug) {
            queryBuilder.andWhere('category.slug = :categorySlug', {
                categorySlug: searchDto.categorySlug,
            });
        }

        // City filter
        if (city) {
            queryBuilder.andWhere('listing.city ILIKE :city', {
                city: `%${city}%`,
            });
        }

        // Rating filter
        if (minRating) {
            queryBuilder.andWhere('listing.averageRating >= :minRating', {
                minRating,
            });
        }

        // Price range filter
        if (priceRange) {
            queryBuilder.andWhere('listing.priceRange = :priceRange', {
                priceRange,
            });
        }

        // Featured only
        if (featuredOnly) {
            queryBuilder.andWhere('listing.isFeatured = :featured', { featured: true });
        }
        if (verifiedOnly) {
            queryBuilder.andWhere('listing.isVerified = :verified', { verified: true });
        }

        // Open Now filter
        if (openNow) {
            const now = new Date();
            const day = now
                .toLocaleDateString('en-US', { weekday: 'long' })
                .toLowerCase();
            const time = now.toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
            });

            // Use the already joined businessHours alias if possible, or add a filter join
            queryBuilder
                .andWhere('businessHours.dayOfWeek = :day', { day })
                .andWhere('businessHours.isOpen = :isOpen', { isOpen: true })
                .andWhere(':time BETWEEN businessHours.openTime AND businessHours.closeTime', {
                    time,
                });
        }

        // Sorting
        // 1) Keyword boost: if the query matches a vendor's metaKeywords, rank that listing first
        if (searchDto.query) {
            queryBuilder.addSelect(
                'CASE WHEN "listing"."search_keywords"::text ILIKE :queryBoost THEN 0 WHEN "listing"."meta_keywords" ILIKE :queryBoost THEN 1 ELSE 2 END',
                'boost',
            );
            queryBuilder.setParameter('queryBoost', `%${searchDto.query}%`);
            queryBuilder.addOrderBy('boost', 'ASC');
        }

        // 2) Secondary sort (user-selected or default relevance)
        switch (sortBy) {
            case SearchSortBy.DISTANCE:
                if (latitude && longitude) {
                    queryBuilder.addOrderBy('distance', 'ASC');
                }
                break;
            case SearchSortBy.RATING:
                queryBuilder.addOrderBy('listing.averageRating', 'DESC');
                break;
            case 'newest':
                queryBuilder.addOrderBy('listing.createdAt', 'DESC');
                break;
            default:
                // Relevance (sponsored > featured > rating)
                queryBuilder
                    .addOrderBy('listing.isSponsored', 'DESC')
                    .addOrderBy('listing.isFeatured', 'DESC')
                    .addOrderBy('listing.averageRating', 'DESC');
        }

        try {
            // Use getManyAndCount for better performance and reliability with skip/take
            // This avoids complex subqueries that often fail in Postgres with many joins
            const [entities, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

            // Map and format results
            const results = entities.map((listing) => {
                // Add any additional formatting here if needed
                return listing;
            });

            return createPaginatedResponse(results, page, limit, total);
        } catch (error: any) {
            // Enhanced robust logging
            try {
                const fs = require('fs');
                const path = require('path');
                const logPath = path.join(process.cwd(), 'permanent_error_log.txt');
                
                // Safely stringify error to avoid circular reference issues
                const safeError = {
                    message: error.message,
                    stack: error.stack,
                    code: error.code,
                    detail: error.detail,
                    query: error.query,
                    parameters: error.parameters
                };
                
                fs.appendFileSync(logPath, `[Search ERROR] ${new Date().toISOString()}: ${error.message}\n` +
                    `Stack: ${error.stack}\n` +
                    `Details: ${JSON.stringify(safeError, null, 2)}\n\n`);
            } catch (loggingError) {
                console.error('CRITICAL: Logging failed during Search error capture:', loggingError);
            }
            
            // Re-throw to maintain original behavior (NestJS will return 500)
            throw error;
        }
    }

    /**
     * Get listing by ID
     */
    async findOne(id: string, user?: User): Promise<Listing> {
        const listing = await this.listingRepository.findOne({
            where: { id },
            relations: [
                'category',
                'vendor',
                'vendor.user',
                'businessHours',
                'businessAmenities',
                'businessAmenities.amenity',
                'reviews',
                'reviews.user',
            ],
        });

        if (!listing) {
            throw new NotFoundException('Listing not found');
        }

        // Only allow public viewing of APPROVED listings
        // Owners and Admins can view regardless of status
        if (listing.status !== BusinessStatus.APPROVED) {
            const isOwner = user && listing.vendor && listing.vendor.userId === user.id;
            const isAdmin = user && (user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN);

            if (!isOwner && !isAdmin) {
                throw new NotFoundException('Listing not found');
            }
        }

        // Only count views from non-owners (skip vendor self-views)
        const isOwner = user && listing.vendor?.user?.id === user.id;
        if (!isOwner) {
            await this.listingRepository.increment({ id }, 'totalViews', 1);
            listing.totalViews = (listing.totalViews || 0) + 1;
        }

        return listing;
    }

    /**
     * Get listing by slug
     */
    async findBySlug(slug: string, user?: User): Promise<Listing> {
        const log = (msg: string) => {
            const fs = require('fs');
            const path = require('path');
            const logFile = path.join(process.cwd(), 'debug_logs.txt');
            fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`);
        };

        log(`findBySlug: ${slug} (User: ${user?.email || 'Public'})`);

        try {
            const listing = await this.listingRepository.findOne({
                where: { slug },
                relations: [
                    'category',
                    'vendor',
                    'vendor.user',
                    'businessHours',
                    'businessAmenities',
                    'businessAmenities.amenity',
                    'reviews',
                    'reviews.user',
                ],
            });

            if (!listing) {
                log(`findBySlug: ${slug} - NOT FOUND IN DB`);
                throw new NotFoundException('Listing not found');
            }

            log(`findBySlug: ${slug} - Found in DB. Status: ${listing.status}`);

            const isPubliclyVisible = listing.status === BusinessStatus.APPROVED;
            if (!isPubliclyVisible) {
                const isOwner = user && listing.vendor && listing.vendor.userId === user.id;
                const isAdmin = user && (user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN);

                if (!isOwner && !isAdmin) {
                    log(`findBySlug: ${slug} - HIDDEN (Status: ${listing.status}, IsOwner: ${!!isOwner}, IsAdmin: ${!!isAdmin})`);
                    throw new NotFoundException('Listing not found');
                }
            }

            // Only count views from non-owners
            const isOwner = user && listing.vendor?.user?.id === user.id;
            if (!isOwner) {
                await this.listingRepository.increment({ id: listing.id }, 'totalViews', 1);
                listing.totalViews = (listing.totalViews || 0) + 1;
            }

            log(`findBySlug: ${slug} - SUCCESS`);
            return listing;
        } catch (error: any) {
            log(`findBySlug: ${slug} - ERROR: ${error.message}\n${error.stack}`);
            throw error;
        }
    }

    /**
     * Update listing
     */
    async update(
        id: string,
        updateBusinessDto: UpdateBusinessDto,
        user: User,
    ): Promise<Listing> {
        const listing = await this.listingRepository.findOne({
            where: { id },
            relations: ['vendor'],
        });

        if (!listing) {
            throw new NotFoundException('Listing not found');
        }

        // Check ownership - Reinforcing filtering as requested
        if (listing.vendor.userId !== user.id && user.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Unauthorized access');
        }

        // Update slug if title changed
        if (updateBusinessDto.title && updateBusinessDto.title !== listing.title) {
            updateBusinessDto['slug'] = generateUniqueSlug(updateBusinessDto.title);
        }

        // Verify category if changed
        if (updateBusinessDto.categoryId && updateBusinessDto.categoryId !== listing.categoryId) {
            const category = await this.categoryRepository.findOne({
                where: { id: updateBusinessDto.categoryId },
            });

            if (!category) {
                throw new NotFoundException('Category not found');
            }

            if (category.status !== CategoryStatus.ACTIVE) {
                throw new BadRequestException('Invalid category: selected category is disabled');
            }
        }

        // Update business hours if provided
        if (updateBusinessDto.businessHours) {
            await this.businessHoursRepository.delete({ businessId: id });
            const hours = updateBusinessDto.businessHours.map((hour) =>
                this.businessHoursRepository.create({
                    businessId: id,
                    ...hour,
                }),
            );
            await this.businessHoursRepository.save(hours);
        }

        // Update amenities if provided
        if (updateBusinessDto.amenityIds) {
            await this.businessAmenityRepository.delete({ businessId: id });
            const amenities = updateBusinessDto.amenityIds.map((amenityId) =>
                this.businessAmenityRepository.create({
                    businessId: id,
                    amenityId,
                }),
            );
            await this.businessAmenityRepository.save(amenities);
        }

        // Remove nested objects from update
        const { businessHours, amenityIds, ...updateData } = updateBusinessDto;

        // Sanitize offerExpiresAt to prevent invalid date errors
        if (
            updateData.offerExpiresAt === '' || 
            updateData.offerExpiresAt === null || 
            (typeof updateData.offerExpiresAt === 'string' && (updateData.offerExpiresAt.includes('NaN') || updateData.offerExpiresAt.includes('Invalid')))
        ) {
            updateData.offerExpiresAt = null as any;
        }

        // Apply updates to the listing object
        Object.assign(listing, updateData);

        await this.listingRepository.save(listing);

        const updatedListing = await this.findOne(id, user);

        // Update in Elasticsearch
        this.searchService.indexBusiness(updatedListing).catch(err => console.error('ES Update Error:', err));

        return updatedListing;
    }

    /**
     * Delete listing
     */
    async remove(id: string, user: User): Promise<void> {
        const listing = await this.listingRepository.findOne({
            where: { id },
            relations: ['vendor'],
        });

        if (!listing) {
            throw new NotFoundException('Listing not found');
        }

        // Check ownership - Reinforcing filtering as requested
        if (listing.vendor.userId !== user.id && user.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Unauthorized access');
        }

        await this.listingRepository.remove(listing);

        // Remove from Elasticsearch
        this.searchService.remove(id).catch(err => console.error('ES Remove Error:', err));
    }

    /**
     * Get vendor's listings
     */
    async getVendorBusinesses(userId: string, page = 1, limit = 20) {
        const vendor = await this.vendorRepository.findOne({
            where: { userId },
        });

        if (!vendor) {
            throw new NotFoundException('Vendor not found');
        }

        const skip = calculateSkip(page, limit);

        const [listings, total] = await this.listingRepository.findAndCount({
            where: { vendorId: vendor.id },
            relations: ['category'],
            order: { createdAt: 'DESC' },
            skip,
            take: limit,
        });

        return createPaginatedResponse(listings, page, limit, total);
    }

    /**
     * Get similar listings (same category)
     */
    async getSimilar(idOrSlug: string, limit = 4): Promise<Listing[]> {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

        let listing;

        if (isUuid) {
            listing = await this.listingRepository.findOne({
                where: { id: idOrSlug },
                select: ['id', 'categoryId'],
            });
        } else {
            listing = await this.listingRepository.findOne({
                where: { slug: idOrSlug },
                select: ['id', 'categoryId'],
            });
        }

        if (!listing) {
            throw new NotFoundException('Listing not found');
        }

        return this.listingRepository.find({
            where: {
                categoryId: listing.categoryId,
                id: Not(listing.id), // Exclude current listing
                status: BusinessStatus.APPROVED,
            },
            take: Number(limit),
        });
    }

    /**
     * Update listing image URL
     */
    async updateImage(id: string, imageUrl: string, user: User): Promise<Listing> {
        const listing = await this.listingRepository.findOne({
            where: { id },
            relations: ['vendor'],
        });

        if (!listing) {
            throw new NotFoundException('Listing not found');
        }

        // Check ownership
        if (listing.vendor.userId !== user.id && user.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Unauthorized access');
        }

        listing.coverImageUrl = imageUrl;
        await this.listingRepository.save(listing);

        return this.findOne(id);
    }

    /**
     * Get all available amenities
     */
    async getAllAmenities(): Promise<Amenity[]> {
        return this.amenityRepository.find({
            order: { name: 'ASC' },
        });
    }

    /**
     * Create a new amenity
     */
    async createAmenity(name: string, icon?: string): Promise<Amenity> {
        const existing = await this.amenityRepository.findOne({
            where: { name },
        });

        if (existing) {
            return existing;
        }

        const amenity = this.amenityRepository.create({
            name,
            icon: icon || 'Sparkles',
        });

        return this.amenityRepository.save(amenity);
    }
}
