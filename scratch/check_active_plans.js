
const { Client } = require('pg');

async function checkActivePlans() {
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
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'active_plans'
        `);
        console.log('Columns:', res.rows.map(r => r.column_name));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkActivePlans();
