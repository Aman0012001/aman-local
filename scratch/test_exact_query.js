
const { Client } = require('pg');

async function testExactQuery() {
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

        const query = `SELECT "SubscriptionPlan"."id" AS "SubscriptionPlan_id", "SubscriptionPlan"."stripe_price_id" AS "SubscriptionPlan_stripe_price_id" FROM "subscription_plans" "SubscriptionPlan" LIMIT 1`;
        console.log('Running:', query);
        const res = await client.query(query);
        console.log('Success:', res.rows);

    } catch (err) {
        console.error('FAILED:', err.message);
        console.error('Code:', err.code);
    } finally {
        await client.end();
    }
}

testExactQuery();
