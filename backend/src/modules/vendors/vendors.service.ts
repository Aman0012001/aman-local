import {
    Injectable,
    NotFoundException,
    ConflictException,
    ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor } from '../../entities/vendor.entity';
import { User, UserRole } from '../../entities/user.entity';
import { Listing } from '../../entities/business.entity';
import { Subscription } from '../../entities/subscription.entity';
import { CreateVendorDto, UpdateVendorDto } from './dto/vendor.dto';
import { OfferEvent, OfferType, OfferStatus } from '../../entities/offer-event.entity';

@Injectable()
export class VendorsService {
    constructor(
        @InjectRepository(Vendor)
        private vendorRepository: Repository<Vendor>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(Listing)
        private listingRepository: Repository<Listing>,
        @InjectRepository(OfferEvent)
        private offerEventRepository: Repository<OfferEvent>,
    ) { }

    /**
     * Register a user as a vendor
     */
    async becomeVendor(userId: string, createVendorDto: CreateVendorDto): Promise<Vendor> {
        // Check if user already has a vendor profile
        let vendor = await this.vendorRepository.findOne({ where: { userId } });
        if (vendor) {
            throw new ConflictException('You are already registered as a vendor');
        }

        // Create vendor profile
        vendor = this.vendorRepository.create({
            ...createVendorDto,
            userId,
            isVerified: false,
        });

        const savedVendor = await this.vendorRepository.save(vendor);

        // Update user role to VENDOR
        await this.userRepository.update(userId, { role: UserRole.VENDOR });

        return savedVendor;
    }

    /**
     * Get current vendor profile
     */
    async getProfile(userId: string): Promise<Vendor> {
        let vendor = await this.vendorRepository.findOne({
            where: { userId },
            relations: ['businesses', 'subscriptions'],
        });

        if (!vendor) {
            console.log(`[VendorsService] No vendor record found for user ${userId} in getProfile — creating one`);
            const user = await this.userRepository.findOne({ where: { id: userId } });
            if (user && user.role === UserRole.VENDOR) {
                vendor = this.vendorRepository.create({
                    userId,
                    isVerified: false,
                });
                try {
                    await this.vendorRepository.save(vendor);
                } catch (err: any) {
                    if (err.code === '23505' || err.message?.includes('duplicate key')) {
                        console.log(`[VendorsService] Handled concurrent creation for ${userId}`);
                    } else {
                        throw err;
                    }
                }
                
                return this.vendorRepository.findOne({
                    where: { userId },
                    relations: ['businesses', 'subscriptions'],
                });
            } else {
                throw new NotFoundException('Vendor profile not found and user is not a vendor');
            }
        }

        return vendor;
    }

    /**
     * Update vendor profile — creates a vendor record if one doesn't exist yet (upsert)
     */
    async updateProfile(userId: string, updateVendorDto: UpdateVendorDto): Promise<Vendor> {
        console.log(`[VendorsService] Updating profile for vendor (user ${userId}):`, JSON.stringify(updateVendorDto, null, 2));

        let vendor = await this.vendorRepository.findOne({
            where: { userId },
            relations: ['businesses', 'subscriptions'],
        });

        if (!vendor) {
            // Auto-create a vendor record for users who have the vendor role
            // but whose vendor profile row was never persisted (race condition / legacy data)
            console.log(`[VendorsService] No vendor record found for user ${userId} — creating one`);
            vendor = this.vendorRepository.create({
                userId,
                isVerified: false,
            });
        }

        Object.assign(vendor, updateVendorDto);
        await this.vendorRepository.save(vendor);
        console.log(`[VendorsService] Vendor profile saved successfully for user ${userId}`);

        return this.vendorRepository.findOne({
            where: { userId },
            relations: ['businesses', 'subscriptions'],
        });
    }

    /**
     * Get vendor statistics (Overview for dashboard)
     */
    async getDashboardStats(userId: string) {
        const vendor = await this.getProfile(userId);

        const businessCount = await this.listingRepository.count({
            where: { vendorId: vendor.id },
        });

        // We'll add lead/review counts later when we integrate those modules
        // but the query builder can handle it now
        const totalLeads = await this.listingRepository
            .createQueryBuilder('listing')
            .select('SUM(listing.totalLeads)', 'total')
            .where('listing.vendorId = :vendorId', { vendorId: vendor.id })
            .getRawOne();

        const totalViews = await this.listingRepository
            .createQueryBuilder('listing')
            .select('SUM(listing.totalViews)', 'total')
            .where('listing.vendorId = :vendorId', { vendorId: vendor.id })
            .getRawOne();

        return {
            businessCount,
            activeSubscription: vendor.subscriptions.find(s => s.status === 'active'),
            totalLeads: parseInt(totalLeads?.total || '0'),
            totalViews: parseInt(totalViews?.total || '0'),
            isVerified: vendor.isVerified,
        };
    }

    /**
     * Submit documents for verification
     */
    async submitVerification(userId: string, documents: any) {
        const vendor = await this.getProfile(userId);
        vendor.verificationDocuments = documents;
        // In a real app, this might trigger an admin notification
        return this.vendorRepository.save(vendor);
    }

    /**
     * Get a public vendor profile by ID
     */
    async getPublicProfile(vendorId: string) {
        const vendor = await this.vendorRepository.findOne({
            where: { id: vendorId },
            relations: ['user'],
        });

        if (!vendor) {
            throw new NotFoundException('Vendor not found');
        }

        const listings = await this.listingRepository.find({
            where: { vendorId: vendor.id, status: 'approved' as any },
            relations: ['category'],
            order: { averageRating: 'DESC' },
        });

        const avgRating = listings.length > 0
            ? listings.reduce((acc, l) => acc + Number(l.averageRating), 0) / listings.length
            : 0;

        const totalViews = listings.reduce((acc, l) => acc + Number(l.totalViews || 0), 0);
        const categories = [...new Set(listings.map(l => l.category?.name).filter(Boolean))];

        // Fetch Offers and Events
        const now = new Date();
        const allOffersEvents = await this.offerEventRepository.createQueryBuilder('oe')
            .where('oe.vendorId = :vendorId', { vendorId: vendor.id })
            .andWhere('oe.isActive = :isActive', { isActive: true })
            .andWhere('oe.status != :expired', { expired: OfferStatus.EXPIRED })
            .andWhere('(oe.expiryDate IS NULL OR oe.expiryDate > :now)', { now })
            .andWhere('(oe.endDate IS NULL OR oe.endDate > :now)', { now })
            .orderBy('oe.createdAt', 'DESC')
            .getMany();

        const offers = allOffersEvents.filter(oe => oe.type === OfferType.OFFER);
        const events = allOffersEvents.filter(oe => oe.type === OfferType.EVENT);

        // Get coordinates from the first listing if available
        const primaryListing = listings[0];

        return {
            id: vendor.id,
            businessName: vendor.businessName || vendor.user?.fullName || 'Unnamed Business',
            vendorName: vendor.user?.fullName || 'Vendor',
            businessEmail: vendor.businessEmail || vendor.user?.email,
            businessPhone: vendor.businessPhone,
            businessAddress: vendor.businessAddress,
            isVerified: vendor.isVerified,
            socialLinks: vendor.socialLinks || [],
            avatarUrl: vendor.user?.avatarUrl || null,
            bio: vendor.bio,
            listingCount: listings.length,
            avgRating: parseFloat(avgRating.toFixed(1)),
            totalViews,
            categories,
            createdAt: vendor.user?.createdAt,
            businessHours: vendor.businessHours ? Object.entries(vendor.businessHours).map(([day, val]) => ({
                dayOfWeek: day,
                ...val
            })) : (primaryListing?.businessHours || []),
            latitude: primaryListing?.latitude || null,
            longitude: primaryListing?.longitude || null,
            listings: listings.map(l => ({
                id: l.id,
                title: l.title,
                slug: l.slug,
                images: l.images,
                averageRating: l.averageRating,
                totalReviews: l.totalReviews,
                city: l.city,
                categoryName: l.category?.name,
            })),
            offers: offers.map(o => ({
                id: o.id,
                title: o.title,
                description: o.description,
                imageUrl: o.imageUrl,
                offerBadge: o.offerBadge,
                expiryDate: o.expiryDate,
            })),
            events: events.map(e => ({
                id: e.id,
                title: e.title,
                description: e.description,
                imageUrl: e.imageUrl,
                startDate: e.startDate,
                endDate: e.endDate,
            })),
        };
    }

    /**
     * Get public vendor profiles whose listings are in a given city
     */
    async getByCity(city: string) {
        // Find all distinct vendorIds that have at least one approved listing in the given city
        const rows = await this.listingRepository
            .createQueryBuilder('listing')
            .select('listing.vendorId', 'vendorId')
            .addSelect('COUNT(listing.id)', 'listingCount')
            .addSelect('AVG(CAST(listing.averageRating AS FLOAT))', 'avgRating')
            .addSelect('SUM(listing.totalViews)', 'totalViews')
            .where('LOWER(listing.city) = LOWER(:city)', { city })
            .andWhere('listing.status = :status', { status: 'approved' })
            .groupBy('listing.vendorId')
            .getRawMany();

        if (!rows.length) return [];

        const vendorIds = rows.map(r => r.vendorId);

        // Load vendor + user data for each
        const vendors = await this.vendorRepository
            .createQueryBuilder('vendor')
            .leftJoinAndSelect('vendor.user', 'user')
            .whereInIds(vendorIds)
            .getMany();

        // Load one representative listing per vendor (for cover image + categories)
        const sampleListings = await this.listingRepository
            .createQueryBuilder('listing')
            .leftJoinAndSelect('listing.category', 'category')
            .where('listing.vendorId IN (:...ids)', { ids: vendorIds })
            .andWhere('listing.status = :status', { status: 'approved' })
            .orderBy('listing.averageRating', 'DESC')
            .getMany();

        // Build vendor profile cards
        return vendors.map(vendor => {
            const stat = rows.find(r => r.vendorId === vendor.id);
            const listings = sampleListings.filter(l => l.vendorId === vendor.id);
            const cover = listings.find(l => l.images?.length) || listings[0];
            const categories = [...new Set(listings.map(l => l.category?.name).filter(Boolean))];

            return {
                id: vendor.id,
                businessName: vendor.businessName || vendor.user?.fullName || 'Unnamed Business',
                vendorName: vendor.user?.fullName || (vendor.user?.email ? vendor.user.email.split('@')[0] : 'Unknown'),
                businessEmail: vendor.businessEmail || vendor.user?.email,
                businessPhone: (vendor.businessPhone && vendor.businessPhone !== '0000000000')
                    ? vendor.businessPhone
                    : (vendor.user?.phone || listings[0]?.phone || null),
                businessAddress: vendor.businessAddress,
                isVerified: vendor.isVerified,
                socialLinks: vendor.socialLinks || [],
                avatarUrl: vendor.user?.avatarUrl || null,
                coverImage: cover?.images?.[0] || null,
                listingCount: parseInt(stat?.listingCount || '0'),
                avgRating: parseFloat(parseFloat(stat?.avgRating || '0').toFixed(1)),
                totalViews: parseInt(stat?.totalViews || '0'),
                categories,
                businessHours: vendor.businessHours ? Object.entries(vendor.businessHours).map(([day, val]) => ({
                    dayOfWeek: day,
                    ...val
                })) : (listings[0]?.businessHours || []),
                sampleListings: listings.slice(0, 3).map(l => ({
                    id: l.id,
                    title: l.title,
                    slug: l.slug,
                    images: l.images,
                })),
            };
        });
    }
}
