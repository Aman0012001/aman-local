const { Client } = require('pg');
require('dotenv').config();

async function createOffersTable() {
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || '5432',
        database: process.env.DB_DATABASE || 'business_saas_db',
    });

    try {
        await client.connect();
        console.log('✅ Connected to database');

        const sql = `
            CREATE TABLE IF NOT EXISTS offers (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                discount VARCHAR(100),
                promo_code VARCHAR(50),
                start_date TIMESTAMP,
                end_date TIMESTAMP,
                expiry_date TIMESTAMP,
                is_active BOOLEAN DEFAULT true,
                is_featured BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_offers_business_id ON offers(business_id);
            CREATE INDEX IF NOT EXISTS idx_offers_is_active ON offers(is_active);
            CREATE INDEX IF NOT EXISTS idx_offers_is_featured ON offers(is_featured);

            -- Seed an offer for Delhi Restaurants 1 if it exists
            INSERT INTO offers (business_id, title, description, discount, is_featured)
            SELECT id, 'Grand Opening Discount', 'Get 20% off on all main courses!', '20% OFF', true
            FROM businesses 
            WHERE slug = 'delhi-restaurants-1'
            LIMIT 1
            ON CONFLICT DO NOTHING;
        `;

        await client.query(sql);
        console.log('✅ Offers table created and seeded successfully!');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await client.end();
    }
}

createOffersTable();
