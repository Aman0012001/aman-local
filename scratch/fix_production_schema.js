const { DataSource } = require('typeorm');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

async function fixSchema() {
    console.log('Connecting to database...');
    console.log('Host:', process.env.DB_HOST);
    console.log('DB:', process.env.DB_DATABASE);

    const AppDataSource = new DataSource({
        type: "postgres",
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        logging: true,
    });

    try {
        await AppDataSource.initialize();
        console.log("Connected to database successfully!");

        console.log("Checking and adding columns to 'users' table...");
        await AppDataSource.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS deletion_scheduled_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 100
        `);
        console.log("Users table updated.");

        console.log("Checking and adding columns to 'vendors' table...");
        await AppDataSource.query(`
            ALTER TABLE vendors 
            ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Pakistan'
        `);
        console.log("Vendors table updated.");

        console.log("Schema sync complete!");
    } catch (error) {
        console.error("Failed to fix schema:", error);
    } finally {
        await AppDataSource.destroy();
    }
}

fixSchema();
