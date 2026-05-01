import { MigrationInterface, QueryRunner } from "typeorm";

export class VendorTableFix1714580000001 implements MigrationInterface {
    name = 'VendorTableFix1714580000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log('--- Starting Vendor & Listing Schema Audit ---');

        // 1. Vendors Table Audit
        await queryRunner.query(`
            DO $$ 
            BEGIN 
                -- city
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='city') THEN
                    ALTER TABLE "vendors" ADD COLUMN "city" character varying(100);
                    RAISE NOTICE 'Added city to vendors';
                END IF;

                -- country
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='country') THEN
                    ALTER TABLE "vendors" ADD COLUMN "country" character varying(100) DEFAULT 'Pakistan';
                    RAISE NOTICE 'Added country to vendors';
                END IF;

                -- business_name
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='business_name') THEN
                    ALTER TABLE "vendors" ADD COLUMN "business_name" character varying;
                    RAISE NOTICE 'Added business_name to vendors';
                END IF;

                -- is_verified
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='is_verified') THEN
                    ALTER TABLE "vendors" ADD COLUMN "is_verified" boolean DEFAULT false;
                    RAISE NOTICE 'Added is_verified to vendors';
                END IF;

                -- verification_documents
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='verification_documents') THEN
                    ALTER TABLE "vendors" ADD COLUMN "verification_documents" jsonb;
                    RAISE NOTICE 'Added verification_documents to vendors';
                END IF;

                -- business_hours
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='business_hours') THEN
                    ALTER TABLE "vendors" ADD COLUMN "business_hours" jsonb;
                    RAISE NOTICE 'Added business_hours to vendors';
                END IF;

                -- social_links
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='social_links') THEN
                    ALTER TABLE "vendors" ADD COLUMN "social_links" jsonb DEFAULT '[]';
                    RAISE NOTICE 'Added social_links to vendors';
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='gst_number') THEN
                    ALTER TABLE "vendors" ADD COLUMN "gst_number" character varying(15);
                    RAISE NOTICE 'Added gst_number to vendors';
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='ntn_number') THEN
                    ALTER TABLE "vendors" ADD COLUMN "ntn_number" character varying(15);
                    RAISE NOTICE 'Added ntn_number to vendors';
                END IF;
            END $$;
        `);

        // 2. Listing (Businesses) Table Audit - ensuring city exists there too
        await queryRunner.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='city') THEN
                    ALTER TABLE "businesses" ADD COLUMN "city" character varying(100);
                    RAISE NOTICE 'Added city to businesses';
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='state') THEN
                    ALTER TABLE "businesses" ADD COLUMN "state" character varying(100);
                    RAISE NOTICE 'Added state to businesses';
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='short_description') THEN
                    ALTER TABLE "businesses" ADD COLUMN "short_description" character varying(500);
                    RAISE NOTICE 'Added short_description to businesses';
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='total_views') THEN
                    ALTER TABLE "businesses" ADD COLUMN "total_views" integer DEFAULT 0;
                    RAISE NOTICE 'Added total_views to businesses';
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='total_leads') THEN
                    ALTER TABLE "businesses" ADD COLUMN "total_leads" integer DEFAULT 0;
                    RAISE NOTICE 'Added total_leads to businesses';
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='has_offer') THEN
                    ALTER TABLE "businesses" ADD COLUMN "has_offer" boolean DEFAULT false;
                    RAISE NOTICE 'Added has_offer to businesses';
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='faqs') THEN
                    ALTER TABLE "businesses" ADD COLUMN "faqs" jsonb DEFAULT '[]';
                    RAISE NOTICE 'Added faqs to businesses';
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='is_sponsored') THEN
                    ALTER TABLE "businesses" ADD COLUMN "is_sponsored" boolean DEFAULT false;
                    RAISE NOTICE 'Added is_sponsored to businesses';
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='recent_until') THEN
                    ALTER TABLE "businesses" ADD COLUMN "recent_until" timestamp with time zone;
                    RAISE NOTICE 'Added recent_until to businesses';
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='latitude') THEN
                    ALTER TABLE "businesses" ADD COLUMN "latitude" numeric(10,8);
                    RAISE NOTICE 'Added latitude to businesses';
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='longitude') THEN
                    ALTER TABLE "businesses" ADD COLUMN "longitude" numeric(11,8);
                    RAISE NOTICE 'Added longitude to businesses';
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='search_keywords') THEN
                    ALTER TABLE "businesses" ADD COLUMN "search_keywords" jsonb DEFAULT '[]';
                    RAISE NOTICE 'Added search_keywords to businesses';
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='meta_keywords') THEN
                    ALTER TABLE "businesses" ADD COLUMN "meta_keywords" text;
                    RAISE NOTICE 'Added meta_keywords to businesses';
                END IF;
            END $$;
        `);

        // 3. Categories Table Audit
        await queryRunner.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='source') THEN
                    ALTER TABLE "categories" ADD COLUMN "source" character varying DEFAULT 'admin';
                    RAISE NOTICE 'Added source to categories';
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='is_featured') THEN
                    ALTER TABLE "categories" ADD COLUMN "is_featured" boolean DEFAULT false;
                    RAISE NOTICE 'Added is_featured to categories';
                END IF;
            END $$;
        `);

        // 4. Users Table Additional Audit
        await queryRunner.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='provider') THEN
                    ALTER TABLE "users" ADD COLUMN "provider" character varying(10) DEFAULT 'local';
                    RAISE NOTICE 'Added provider to users';
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='google_id') THEN
                    ALTER TABLE "users" ADD COLUMN "google_id" character varying;
                    RAISE NOTICE 'Added google_id to users';
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_online') THEN
                    ALTER TABLE "users" ADD COLUMN "is_online" boolean DEFAULT false;
                    RAISE NOTICE 'Added is_online to users';
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='city') THEN
                    ALTER TABLE "users" ADD COLUMN "city" character varying(100);
                    RAISE NOTICE 'Added city to users';
                END IF;
            END $$;
        `);

        console.log('--- Vendor & Listing Schema Audit Completed ---');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // No down migration for production safety
    }
}
