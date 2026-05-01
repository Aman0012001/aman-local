import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { Listing } from './business.entity';
import { User } from './user.entity';

@Entity('listing_views')
export class ListingView {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'listing_id', type: 'uuid' })
    @Index()
    listingId: string;

    @Column({ name: 'user_id', type: 'uuid', nullable: true })
    @Index()
    userId: string;

    @Column({ name: 'ip_address', nullable: true })
    ipAddress: string;

    @Column({ name: 'user_agent', type: 'text', nullable: true })
    userAgent: string;

    @CreateDateColumn({ name: 'created_at' })
    @Index()
    createdAt: Date;

    @ManyToOne(() => Listing, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'listing_id' })
    listing: Listing;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'user_id' })
    user: User;
}
