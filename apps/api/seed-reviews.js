const { Client } = require('pg');
require('dotenv').config();

async function seedReviews() {
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

        // 1. Get a business
        const businessRes = await client.query('SELECT id FROM businesses LIMIT 1');
        if (businessRes.rows.length === 0) {
            console.log('❌ No businesses found. Please seed businesses first.');
            return;
        }
        const businessId = businessRes.rows[0].id;

        // 2. Get a user
        const userRes = await client.query('SELECT id FROM users LIMIT 1');
        if (userRes.rows.length === 0) {
            console.log('❌ No users found. Please seed users first.');
            return;
        }
        const userId = userRes.rows[0].id;

        // 3. Seed some reviews
        const reviews = [
            { comment: "Amazing service! Highly recommend this place for everyone.", rating: 5 },
            { comment: "The quality of work was exceptional. Will definitely come back.", rating: 5 },
            { comment: "Very professional team and great environment.", rating: 5 },
            { comment: "Best experience I've had in a long time. 10/10!", rating: 5 },
            { comment: "Super fast and reliable. Exactly what I was looking for.", rating: 5 }
        ];

        for (const rev of reviews) {
            await client.query(
                'INSERT INTO reviews (id, business_id, user_id, comment, rating, created_at, updated_at) VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW()) ON CONFLICT DO NOTHING',
                [businessId, userId, rev.comment, rev.rating]
            );
        }

        console.log('✅ Seeded 5 high-quality reviews successfully!');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await client.end();
    }
}

seedReviews();
