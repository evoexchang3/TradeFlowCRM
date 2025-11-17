import { Pool } from 'pg';

const dbUrl = process.env.DATABASE_URL;
console.log('DATABASE_URL (first 70 chars):', dbUrl ? dbUrl.substring(0, 70) + '...' : 'NOT SET');

const pool = new Pool({ connectionString: dbUrl });

async function check() {
  try {
    const clientsResult = await pool.query("SELECT COUNT(*) as count FROM clients");
    console.log('\n✓ Connected to production database successfully!');
    console.log('📊 Clients:', clientsResult.rows[0].count);
    
    const usersResult = await pool.query("SELECT COUNT(*) as count FROM users");
    console.log('📊 Users:', usersResult.rows[0].count);
    
    const accountsResult = await pool.query("SELECT COUNT(*) as count FROM accounts");
    console.log('📊 Accounts:', accountsResult.rows[0].count);
    
    const tables = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
    console.log('\n📋 Total tables:', tables.rows.length);
    console.log('Sample tables:', tables.rows.slice(0, 10).map((r: any) => r.tablename).join(', '));
    
    console.log('\n✅ This is the production database with data!');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

check();
