import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadStatus } from '../../entities/lead.entity';
import { Listing } from '../../entities/business.entity';
import { Vendor } from '../../entities/vendor.entity';
import { User, UserRole } from '../../entities/user.entity';
import { ListingView } from '../../entities/listing-view.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { GetLeadsDto } from './dto/get-leads.dto';
import {
    createPaginatedResponse,
    calculateSkip,
} from '../../common/utils/pagination.util';

import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class LeadsService {
    constructor(
        @InjectRepository(Lead)
        private leadRepository: Repository<Lead>,
        @InjectRepository(Listing)
        private readonly listingRepository: Repository<Listing>,
        @InjectRepository(Vendor)
        private vendorRepository: Repository<Vendor>,
        @InjectRepository(ListingView)
        private readonly listingViewRepository: Repository<ListingView>,
        private notificationsGateway: NotificationsGateway,
        private notificationsService: NotificationsService,
    ) { }
    
    // onModuleInit removed to avoid potential deadlocks with TypeORM synchronization

    /**
     * Create a new lead (Customer interaction)
     */
    async create(
        createLeadDto: CreateLeadDto,
        user?: User,
        meta?: { ipAddress?: string; userAgent?: string; referrer?: string },
    ): Promise<Lead> {
        const { businessId } = createLeadDto;

        const listing = await this.listingRepository.findOne({
            where: { id: businessId },
        });

        if (!listing) {
            throw new NotFoundException('Listing not found');
        }

        const lead = this.leadRepository.create({
            ...createLeadDto,
            userId: user?.id,
            status: LeadStatus.NEW,
            ipAddress: meta?.ipAddress,
            userAgent: meta?.userAgent,
            referrer: meta?.referrer,
        });

        const savedLead = await this.leadRepository.save(lead);

        // Increment lead counter on business
        await this.listingRepository.increment({ id: businessId }, 'totalLeads', 1);

        // Notify vendor in real-time
        const vendor = await this.vendorRepository.findOne({
            where: { id: listing.vendorId },
        });

        // Notify vendor via persistent notification and Web Push
        if (vendor) {
            await this.notificationsService.create({
                userId: vendor.userId,
                title: '🆕 New Lead Received!',
                message: `You have a new ${savedLead.type} lead for "${listing.title}" from ${savedLead.name}.`,
                type: 'new_lead',
                data: {
                    leadId: savedLead.id,
                    businessName: listing.title,
                    customerName: savedLead.name,
                    type: savedLead.type,
                    createdAt: savedLead.createdAt,
                },
                link: '/vendor/leads',
            }).catch(err => console.error('[LeadsService] Push notification failed:', err.message));
        }

        return savedLead;
    }

    /**
     * Get leads for a vendor (Vendor dashboard)
     */
    async findAllForVendor(userId: string, getLeadsDto: GetLeadsDto) {
        const { page = 1, limit = 20, businessId, type, status } = getLeadsDto;
        const skip = calculateSkip(page, limit);

        let vendor = await this.vendorRepository.findOne({
            where: { userId },
        });

        if (!vendor) {
            const userUser = await this.vendorRepository.manager.findOne(User, { where: { id: userId }, select: ['id', 'role'] });
            if (userUser && userUser.role === UserRole.VENDOR) {
                const newVendor = this.vendorRepository.create({ userId, isVerified: false });
                try {
                    await this.vendorRepository.save(newVendor);
                } catch (err: any) {
                    if (err.code !== '23505' && !err.message?.includes('duplicate key')) throw err;
                }
                vendor = await this.vendorRepository.findOne({ where: { userId } });
            }
            if (!vendor) {
                throw new ForbiddenException('Only vendors can view their leads');
            }
        }

        const queryBuilder = this.leadRepository
            .createQueryBuilder('lead')
            .innerJoin('lead.business', 'business')
            .where('business.vendorId = :vendorId', { vendorId: vendor.id });

        if (businessId) {
            queryBuilder.andWhere('lead.businessId = :businessId', { businessId });
        }

        if (type) {
            queryBuilder.andWhere('lead.type = :type', { type });
        }

        if (status) {
            queryBuilder.andWhere('lead.status = :status', { status });
        }

        queryBuilder.orderBy('lead.createdAt', 'DESC');

        const total = await queryBuilder.getCount();
        const leads = await queryBuilder.skip(skip).take(limit).getMany();

        return createPaginatedResponse(leads, page, limit, total);
    }

    /**
     * Get leads for a user (User dashboard)
     */
    async findAllForUser(userId: string, getLeadsDto: GetLeadsDto) {
        const { page = 1, limit = 20, type, status } = getLeadsDto;
        const skip = calculateSkip(page, limit);

        const queryBuilder = this.leadRepository
            .createQueryBuilder('lead')
            .leftJoinAndSelect('lead.business', 'business')
            .where('lead.userId = :userId', { userId });

        if (type) {
            queryBuilder.andWhere('lead.type = :type', { type });
        }

        if (status) {
            queryBuilder.andWhere('lead.status = :status', { status });
        }

        queryBuilder.orderBy('lead.createdAt', 'DESC');

        const total = await queryBuilder.getCount();
        const leads = await queryBuilder.skip(skip).take(limit).getMany();

        return createPaginatedResponse(leads, page, limit, total);
    }

    /**
     * Get lead by ID
     */
    async findOne(id: string, userId: string): Promise<Lead> {
        const lead = await this.leadRepository.findOne({
            where: { id },
            relations: ['business', 'business.vendor'],
        });

        if (!lead) {
            throw new NotFoundException(`Lead with ID ${id} not found`);
        }

        if (!lead.business || !lead.business.vendor) {
            console.error(`[LeadsService] Lead ${id} missing business/vendor relation.`);
            // Still allow access — just can't do ownership check
            return lead;
        }

        // Fetch user role from DB
        const user = await this.vendorRepository.manager.findOne(User, {
            where: { id: userId },
            select: ['id', 'role'],
        });

        // SuperAdmin and Admin: bypass ownership
        if (user?.role === UserRole.SUPERADMIN || user?.role === UserRole.ADMIN) {
            return lead;
        }

        const isOwner = lead.business.vendor.userId === userId;
        if (!isOwner) {
            console.warn(`[LeadsService] Access denied: user ${userId} tried to access lead ${id}`);
            throw new ForbiddenException('You do not have permission to access this lead');
        }

        return lead;
    }

    /**
     * Update lead status (Vendor action)
     */
    async updateStatus(
        id: string,
        updateLeadStatusDto: UpdateLeadStatusDto,
        userId: string,
    ): Promise<{ success: boolean; id: string; status: string }> {
        console.log(`[LeadsService] updateStatus: id=${id}, status=${updateLeadStatusDto.status}, userId=${userId}`);

        // Permission check
        await this.findOne(id, userId);

        try {
            const updateData: Partial<Lead> = {
                status: updateLeadStatusDto.status,
            };

            if (updateLeadStatusDto.status === LeadStatus.CONTACTED) {
                updateData.contactedAt = new Date();
            } else if (updateLeadStatusDto.status === LeadStatus.CONVERTED) {
                updateData.convertedAt = new Date();
            }

            if (updateLeadStatusDto.notes !== undefined) {
                updateData.notes = updateLeadStatusDto.notes;
            }

            await this.leadRepository.update(id, updateData);
            console.log(`[LeadsService] Lead ${id} updated to status: ${updateLeadStatusDto.status}`);

            return { success: true, id, status: updateLeadStatusDto.status };
        } catch (err) {
            console.error(`[LeadsService] updateStatus DB Error for lead ${id}:`, err.message, err.code);
            throw err;
        }
    }

    /**
     * Get basic stats for a vendor including daily trends
     */
    async getVendorLeadStats(userId: string, days: number = 7) {
        let vendor = await this.vendorRepository.findOne({
            where: { userId },
        });

        if (!vendor) {
            const userUser = await this.vendorRepository.manager.findOne(User, { where: { id: userId }, select: ['id', 'role'] });
            if (userUser && userUser.role === UserRole.VENDOR) {
                const newVendor = this.vendorRepository.create({ userId, isVerified: false });
                try {
                    await this.vendorRepository.save(newVendor);
                } catch (err: any) {
                    if (err.code !== '23505' && !err.message?.includes('duplicate key')) throw err;
                }
                vendor = await this.vendorRepository.findOne({ where: { userId } });
            }
            if (!vendor) {
                throw new ForbiddenException('Only vendors can view stats');
            }
        }

        // 1. Get status-based stats (current logic)
        const statusStats = await this.leadRepository
            .createQueryBuilder('lead')
            .innerJoin('lead.business', 'business')
            .select('lead.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .where('business.vendorId = :vendorId', { vendorId: vendor.id })
            .groupBy('lead.status')
            .getRawMany();

        const result = statusStats.reduce((acc, curr) => {
            acc[curr.status] = parseInt(curr.count);
            return acc;
        }, {});

        // 2. Get daily trends for the chart
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        // Daily Leads
        const dailyLeadsRaw = await this.leadRepository.createQueryBuilder('lead')
            .innerJoin('lead.business', 'business')
            .select("DATE_TRUNC('day', lead.createdAt)", 'day')
            .addSelect('COUNT(*)', 'count')
            .where('business.vendorId = :vendorId', { vendorId: vendor.id })
            .andWhere('lead.createdAt >= :startDate', { startDate })
            .groupBy('day')
            .orderBy('day', 'ASC')
            .getRawMany();

        // Daily Views
        const dailyViewsRaw = await this.listingViewRepository.createQueryBuilder('view')
            .innerJoin('view.listing', 'business')
            .select("DATE_TRUNC('day', view.createdAt)", 'day')
            .addSelect('COUNT(*)', 'count')
            .where('business.vendorId = :vendorId', { vendorId: vendor.id })
            .andWhere('view.createdAt >= :startDate', { startDate })
            .groupBy('day')
            .orderBy('day', 'ASC')
            .getRawMany();

        // Format into a map for easy lookup
        const leadsMap = new Map(dailyLeadsRaw.map(l => [new Date(l.day).toDateString(), parseInt(l.count)]));
        const viewsMap = new Map(dailyViewsRaw.map(v => [new Date(v.day).toDateString(), parseInt(v.count)]));

        // Generate the trend array for the requested period
        const dailyTrend = [];
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - (days - 1 - i));
            const dateStr = date.toDateString();
            
            dailyTrend.push({
                day: days > 7 ? `${date.getDate()}/${date.getMonth() + 1}` : daysOfWeek[date.getDay()],
                views: viewsMap.get(dateStr) || 0,
                leads: leadsMap.get(dateStr) || 0,
            });
        }

        result['dailyTrend'] = dailyTrend;
        return result;
    }
    /**
     * Vendor replies to a user enquiry
     */
    async replyToEnquiry(
        leadId: string,
        replyMessage: string,
        vendorUserId: string,
    ): Promise<Lead> {
        const lead = await this.leadRepository.findOne({
            where: { id: leadId },
            relations: ['business', 'business.vendor'],
        });

        if (!lead) throw new NotFoundException('Enquiry not found');
        if (lead.business.vendor.userId !== vendorUserId) {
            throw new ForbiddenException('You can only reply to your own enquiries');
        }

        lead.vendorReply = replyMessage;
        lead.vendorRepliedAt = new Date();
        lead.status = LeadStatus.CONTACTED;
        const saved = await this.leadRepository.save(lead);

        // Notify the user who sent the enquiry (if they have an account)
        if (lead.userId) {
            await this.notificationsService.create({
                userId: lead.userId,
                title: '💬 Vendor Replied to Your Enquiry',
                message: `${lead.business.title} has replied to your enquiry: "${replyMessage.slice(0, 80)}${replyMessage.length > 80 ? '...' : ''}"`,
                type: 'enquiry_reply',
                data: { leadId: lead.id, businessId: lead.businessId, slug: lead.business.slug },
            });
        }

        return saved;
    }
}
