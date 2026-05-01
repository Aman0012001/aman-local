import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Query,
    UseGuards,
    Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { GetLeadsDto } from './dto/get-leads.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { User, UserRole } from '../../entities/user.entity';

@ApiTags('leads')
@Controller('leads')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeadsController {
    constructor(private readonly leadsService: LeadsService) { }

    @Public()
    @Post()
    @ApiOperation({ summary: 'Create a new lead (Public/User interaction)' })
    @ApiResponse({ status: 201, description: 'Lead recorded successfully' })
    async create(
        @Body() createLeadDto: CreateLeadDto,
        @CurrentUser() user: User,
        @Req() req: Request,
    ) {
        const meta = {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            referrer: req.headers['referer'],
        };
        return this.leadsService.create(createLeadDto, user, meta);
    }

    @Get('vendor')
    @Roles(UserRole.VENDOR, UserRole.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all leads for the current vendor' })
    @ApiResponse({ status: 200, description: 'Leads retrieved successfully' })
    async findAll(@CurrentUser() user: User, @Query() getLeadsDto: GetLeadsDto) {
        return this.leadsService.findAllForVendor(user.id, getLeadsDto);
    }

    @Get('my-enquiries')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all enquiries sent by the current user' })
    @ApiResponse({ status: 200, description: 'Enquiries retrieved successfully' })
    async findMyEnquiries(@CurrentUser() user: User, @Query() getLeadsDto: GetLeadsDto) {
        return this.leadsService.findAllForUser(user.id, getLeadsDto);
    }

    @Get('vendor/stats')
    @Roles(UserRole.VENDOR, UserRole.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get lead statistics for the current vendor' })
    @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
    async getStats(
        @CurrentUser() user: User,
        @Query('period') period?: string
    ) {
        let days = 7;
        if (period === '30d') days = 30;
        else if (period === '90d') days = 90;
        
        return this.leadsService.getVendorLeadStats(user.id, days);
    }

    @Get(':id')
    @Roles(UserRole.VENDOR, UserRole.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get lead details by ID' })
    @ApiResponse({ status: 200, description: 'Lead details retrieved' })
    @ApiResponse({ status: 404, description: 'Lead not found' })
    async findOne(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: User) {
        return this.leadsService.findOne(id, user.id);
    }

    @Patch(':id/status')
    @Roles(UserRole.VENDOR, UserRole.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update lead status (Vendor action)' })
    @ApiResponse({ status: 200, description: 'Lead status updated successfully' })
    async updateStatus(
        @Param('id', ParseUuidPipe) id: string,
        @Body() updateLeadStatusDto: UpdateLeadStatusDto,
        @CurrentUser() user: User,
    ) {
        return this.leadsService.updateStatus(id, updateLeadStatusDto, user.id);
    }

    @Patch(':id/reply')
    @Roles(UserRole.VENDOR, UserRole.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Vendor replies to an enquiry, notifying the user' })
    @ApiResponse({ status: 200, description: 'Reply sent successfully' })
    async replyToEnquiry(
        @Param('id', ParseUuidPipe) id: string,
        @Body('message') message: string,
        @CurrentUser() user: User,
    ) {
        return this.leadsService.replyToEnquiry(id, message, user.id);
    }
}
