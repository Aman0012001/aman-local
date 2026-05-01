const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

async function checkEnums() {
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
        
        const res = await client.query(`
            SELECT enumlabel 
            FROM pg_enum 
            JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
            WHERE pg_type.typname = 'businesses_status_enum'
            OR pg_type.typname = 'business_status_enum';
        `);
        
        console.log('Enum values for status:', res.rows.map(r => r.enumlabel));

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

checkEnums();
