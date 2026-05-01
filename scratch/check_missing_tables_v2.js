
const { Client } = require('pg');

async function checkAllTables() {
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
        const res = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        const existingTables = res.rows.map(r => r.table_name);
        
        const entities = [
            'active_plans', 'affiliates', 'amenities', 'business_amenities', 'business_hours',
            'businesses', 'categories', 'chat_conversations', 'chat_messages', 'cities',
            'comment_replies', 'comments', 'favorites', 'follows', 'job_lead_responses',
            'job_leads', 'leads', 'notification_logs', 'notifications', 'offer_events',
            'payouts', 'pricing_plans', 'promotion_bookings', 'promotion_pricing_rules',
            'affiliate_referrals', 'review_helpful_votes', 'review_replies', 'reviews', 'search_logs',
            'subscription_plans', 'subscriptions', 'system_settings', 'transactions',
            'users', 'vendors'
        ];
        
        const missing = entities.filter(e => !existingTables.includes(e));
        console.log('Missing tables:', missing);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkAllTables();
