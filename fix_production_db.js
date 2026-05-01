const { Client } = require('pg');

const client = new Client({
    host: '66.33.22.240',
    port: 45505,
    user: 'postgres',
    password: 'RvkwtnMaGpHpXnkqniMeDvRBOKAxihdI',
    database: 'railway',
    ssl: { rejectUnauthorized: false }
});

async function runMigration() {
    try {
        await client.connect();
        console.log('Connected to Railway Database.');

        // 1. Fix Users Table (Add delete_at and deleted_at for safety)
        console.log('Migrating users table...');
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS delete_at TIMESTAMP;`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;`);
        
        // 2. Fix Businesses Table (Add recent_until)
        console.log('Migrating businesses table...');
        await client.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS recent_until TIMESTAMP;`);

        // 3. Fix Subscription Plans (Add stripe_price_id)
        console.log('Migrating subscription_plans table...');
        await client.query(`ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255);`);

        // 4. Fix Pricing Plans (Add stripe_price_id)
        console.log('Migrating pricing_plans table...');
        await client.query(`ALTER TABLE pricing_plans ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255);`);

        // 5. Fix Categories Table (Add is_featured)
        console.log('Migrating categories table...');
        await client.query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;`);
        await client.query(`CREATE INDEX IF NOT EXISTS "IDX_categories_is_featured" ON categories(is_featured);`);

        console.log('✅ Migration completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        await client.end();
    }
}

runMigration();
