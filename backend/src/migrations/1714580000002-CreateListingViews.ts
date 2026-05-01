import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateListingViews1714580000002 implements MigrationInterface {
    name = 'CreateListingViews1714580000002'

    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log('--- Creating listing_views table ---');

        // Ensure uuid-ossp extension exists
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "listing_views" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "listing_id" uuid NOT NULL,
                "user_id" uuid,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_listing_views" PRIMARY KEY ("id")
            );
        `);

        // Add foreign key if it doesn't exist
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'FK_listing_views_listing') THEN
                    ALTER TABLE "listing_views" 
                    ADD CONSTRAINT "FK_listing_views_listing" 
                    FOREIGN KEY ("listing_id") REFERENCES "businesses"("id") ON DELETE CASCADE;
                END IF;
            END $$;
        `);
        
        console.log('--- listing_views table created successfully ---');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }
}
