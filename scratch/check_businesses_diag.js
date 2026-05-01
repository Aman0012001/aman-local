const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

async function checkBusinesses() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to DB');

        console.log('\n--- Checking table: businesses ---');
        const res = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'businesses';`);
        console.log('Columns:', res.rows.map(r => `${r.column_name} (${r.data_type})`));

        console.log('\n--- Checking row count: businesses ---');
        const countRes = await client.query(`SELECT COUNT(*) FROM businesses;`);
        console.log('Count:', countRes.rows[0].count);

        console.log('\n--- Checking for errors in a sample search query ---');
        try {
            // Simulate a typical search query
            const searchRes = await client.query(`SELECT * FROM businesses LIMIT 1;`);
            console.log('Sample row fetched successfully');
        } catch (searchErr) {
            console.error('Search query failed:', searchErr.message);
        }

    } catch (err) {
        console.error('Database connection error:', err);
    } finally {
        await client.end();
    }
}

checkBusinesses();
