import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';
import { Listing } from '../../entities/business.entity';
import { BusinessHours } from '../../entities/business-hours.entity';
import { BusinessAmenity } from '../../entities/business-amenity.entity';
import { Amenity } from '../../entities/amenity.entity';
import { Category } from '../../entities/category.entity';
import { Vendor } from '../../entities/vendor.entity';
import { SearchModule } from '../search/search.module';
import { DemandModule } from '../demand/demand.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AffiliateModule } from '../affiliate/affiliate.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { Subscription } from '../../entities/subscription.entity';
import { SubscriptionPlan } from '../../entities/subscription-plan.entity';
import { ListingView } from '../../entities/listing-view.entity';

import { ActivePlan } from '../../entities/active-plan.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Listing,
            BusinessHours,
            BusinessAmenity,
            Amenity,
            Category,
            Vendor,
            ActivePlan,
            Subscription,
            SubscriptionPlan,
            ListingView,
        ]),
        NotificationsModule,
        SearchModule,
        DemandModule,
        AffiliateModule,
        SubscriptionsModule,
    ],
    controllers: [BusinessesController],
    providers: [BusinessesService],
    exports: [BusinessesService],
})
export class BusinessesModule { }
