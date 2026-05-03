import {
    IsOptional,
    IsString,
    IsNumber,
    IsUUID,
    Min,
    Max,
    IsEnum,
    IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export enum SearchSortBy {
    RELEVANCE = 'relevance',
    DISTANCE = 'distance',
    RATING = 'rating',
    NEWEST = 'newest',
    MOST_REVIEWED = 'most_reviewed',
    FEATURED_FIRST = 'featured_first',
}

export class SearchBusinessDto extends PaginationDto {
    @ApiPropertyOptional({ example: 'restaurant' })
    @IsOptional()
    @IsString()
    query?: string;

    @ApiPropertyOptional({ example: 40.7128, description: 'User latitude' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(-90)
    @Max(90)
    latitude?: number;

    @ApiPropertyOptional({ example: -74.0060, description: 'User longitude' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(-180)
    @Max(180)
    longitude?: number;

    @ApiPropertyOptional({ example: 10, description: 'Search radius in kilometers', default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(100)
    radius?: number = 10;

    @ApiPropertyOptional({ description: 'Category UUID' })
    @IsOptional()
    @IsUUID()
    categoryId?: string;

    @ApiPropertyOptional({ example: 'New York' })
    @IsOptional()
    @IsString()
    city?: string;

    @ApiPropertyOptional({ example: 'restaurants' })
    @IsOptional()
    @IsString()
    categorySlug?: string;

    @ApiPropertyOptional({ example: 4, minimum: 1, maximum: 5 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(5)
    minRating?: number;


    @ApiPropertyOptional({ default: false })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    openNow?: boolean = false;

    @ApiPropertyOptional({ default: false })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    featuredOnly?: boolean = false;

    @ApiPropertyOptional({ default: false })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    verifiedOnly?: boolean = false;

    @ApiPropertyOptional({ enum: SearchSortBy, default: SearchSortBy.RELEVANCE })
    @IsOptional()
    @IsEnum(SearchSortBy)
    sortBy?: SearchSortBy = SearchSortBy.RELEVANCE;

    @ApiPropertyOptional({ description: 'The ID of the user performing the search (internal use)' })
    @IsOptional()
    @IsUUID()
    userId?: string;

    @ApiPropertyOptional({ example: 'Pakistan' })
    @IsOptional()
    @IsString()
    country?: string;

    @ApiPropertyOptional({ example: 'Punjab' })
    @IsOptional()
    @IsString()
    state?: string;

    @ApiPropertyOptional({ example: 'Gulberg' })
    @IsOptional()
    @IsString()
    area?: string;

    @ApiPropertyOptional({ description: 'Subcategory UUID' })
    @IsOptional()
    @IsUUID()
    subcategoryId?: string;

    @ApiPropertyOptional({ description: 'Multi-select category UUIDs' })
    @IsOptional()
    @IsString() // TypeORM/ClassValidator handle as CSV string in query usually, or we parse array
    categoryIds?: string;

    @ApiPropertyOptional({ description: 'Amenity UUIDs (Services/Facilities)' })
    @IsOptional()
    @IsString()
    amenityIds?: string;

    @ApiPropertyOptional({ example: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    minReviews?: number;
}
