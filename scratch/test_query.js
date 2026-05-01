
const { Client } = require('pg');

async function testQuery() {
    const client = new Client({
        host: '66.33.22.240',
        port: 45505,
        user: 'postgres',
        password: 'RvkwtnMaGpHpXnkqniMeDvRBOKAxihdI',
        database: 'railway',
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database');

        console.log('Testing businesses.followers_count...');
        const res1 = await client.query('SELECT followers_count FROM businesses LIMIT 1');
        console.log('Success:', res1.rows);

        console.log('Testing subscription_plans.stripe_price_id...');
        const res2 = await client.query('SELECT stripe_price_id FROM subscription_plans LIMIT 1');
        console.log('Success:', res2.rows);

        console.log('Testing users.trust_score...');
        const res3 = await client.query('SELECT trust_score, deletion_scheduled_at FROM users LIMIT 1');
        console.log('Success:', res3.rows);

    } catch (err) {
        console.error('FAILED:', err.message);
    } finally {
        await client.end();
    }
}

testQuery();
