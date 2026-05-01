import { MigrationInterface, QueryRunner } from "typeorm";

export class SchemaAuditFix1714580000000 implements MigrationInterface {
    name = 'SchemaAuditFix1714580000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log('--- Starting Production Schema Audit & Fix ---');

        // 1. Users Table Audit
        await queryRunner.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='trust_score') THEN
                    ALTER TABLE "users" ADD COLUMN "trust_score" integer DEFAULT 100;
                    RAISE NOTICE 'Added trust_score to users';
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='deletion_scheduled_at') THEN
                    ALTER TABLE "users" ADD COLUMN "deletion_scheduled_at" timestamp with time zone;
                    RAISE NOTICE 'Added deletion_scheduled_at to users';
                END IF;
            END $$;
        `);

        // 2. Subscription Plans Audit
        await queryRunner.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscription_plans' AND column_name='stripe_price_id') THEN
                    ALTER TABLE "subscription_plans" ADD COLUMN "stripe_price_id" character varying;
                    RAISE NOTICE 'Added stripe_price_id to subscription_plans';
                END IF;
            END $$;
        `);

        // 3. Businesses (Listing) Audit
        await queryRunner.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='followers_count') THEN
                    ALTER TABLE "businesses" ADD COLUMN "followers_count" integer DEFAULT 0;
                    RAISE NOTICE 'Added followers_count to businesses';
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='country') THEN
                    ALTER TABLE "businesses" ADD COLUMN "country" character varying;
                    RAISE NOTICE 'Added country to businesses';
                END IF;
            END $$;
        `);

        // 4. Pricing Plans Audit
        await queryRunner.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pricing_plans' AND column_name='stripe_price_id') THEN
                    ALTER TABLE "pricing_plans" ADD COLUMN "stripe_price_id" character varying;
                    RAISE NOTICE 'Added stripe_price_id to pricing_plans';
                END IF;
            END $$;
        `);

        console.log('--- Production Schema Audit & Fix Completed ---');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Down migrations are empty to prevent accidental data loss in production
    }
}
