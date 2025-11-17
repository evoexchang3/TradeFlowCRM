import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './shared/schema';

const prodPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_oHTA4VnZB9xO@ep-shy-meadow-adqyzgor.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

const newPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_hpksyzf6SXP8@ep-wandering-smoke-a8yw3qyw-pooler.eastus2.azure.neon.tech/neondb?sslmode=require&channel_binding=require'
});

const prodDb = drizzle(prodPool, { schema });
const newDb = drizzle(newPool, { schema });

async function migrate() {
  console.log('🚀 Starting data migration using Drizzle ORM...\n');
  
  try {
    // 1. Roles (no dependencies)
    console.log('Migrating roles...');
    const roles = await prodDb.select().from(schema.roles);
    if (roles.length > 0) {
      await newDb.delete(schema.roles);
      await newDb.insert(schema.roles).values(roles);
      console.log(`✓ ${roles.length} roles`);
    }
    
    // 2. Users (depends on roles)
    console.log('Migrating users...');
    const users = await prodDb.select().from(schema.users);
    if (users.length > 0) {
      await newDb.delete(schema.users);
      await newDb.insert(schema.users).values(users);
      console.log(`✓ ${users.length} users`);
    }
    
    // 3. Teams (depends on users for leader_id)
    console.log('Migrating teams...');
    const teams = await prodDb.select().from(schema.teams);
    if (teams.length > 0) {
      await newDb.delete(schema.teams);
      await newDb.insert(schema.teams).values(teams);
      console.log(`✓ ${teams.length} teams`);
    }
    
    // 4. Clients (depends on teams, users)
    console.log('Migrating clients...');
    const clients = await prodDb.select().from(schema.clients);
    if (clients.length > 0) {
      await newDb.delete(schema.clients);
      await newDb.insert(schema.clients).values(clients);
      console.log(`✓ ${clients.length} clients`);
    }
    
    // 5. Accounts (depends on clients)
    console.log('Migrating accounts...');
    const accounts = await prodDb.select().from(schema.accounts);
    if (accounts.length > 0) {
      await newDb.delete(schema.accounts);
      await newDb.insert(schema.accounts).values(accounts);
      console.log(`✓ ${accounts.length} accounts`);
    }
    
    // 6. Subaccounts (depends on accounts)
    console.log('Migrating subaccounts...');
    const subaccounts = await prodDb.select().from(schema.subaccounts);
    if (subaccounts.length > 0) {
      await newDb.insert(schema.subaccounts).values(subaccounts);
      console.log(`✓ ${subaccounts.length} subaccounts`);
    }
    
    // 7. Transactions (depends on accounts/subaccounts)
    console.log('Migrating transactions...');
    const transactions = await prodDb.select().from(schema.transactions);
    if (transactions.length > 0) {
      await newDb.insert(schema.transactions).values(transactions);
      console.log(`✓ ${transactions.length} transactions`);
    }
    
    // 8. Orders (depends on accounts)
    console.log('Migrating orders...');
    const orders = await prodDb.select().from(schema.orders);
    if (orders.length > 0) {
      await newDb.insert(schema.orders).values(orders);
      console.log(`✓ ${orders.length} orders`);
    }
    
    // 9. Positions (depends on accounts)
    console.log('Migrating positions...');
    const positions = await prodDb.select().from(schema.positions);
    if (positions.length > 0) {
      await newDb.insert(schema.positions).values(positions);
      console.log(`✓ ${positions.length} positions`);
    }
    
    // 10. Audit logs (depends on users)
    console.log('Migrating audit_logs...');
    const auditLogs = await prodDb.select().from(schema.auditLogs);
    if (auditLogs.length > 0) {
      await newDb.insert(schema.auditLogs).values(auditLogs);
      console.log(`✓ ${auditLogs.length} audit_logs`);
    }
    
    console.log('\n✅ Core data migration complete!');
    
  } catch (error: any) {
    console.error('\n❌ Migration error:', error.message);
    throw error;
  } finally {
    await prodPool.end();
    await newPool.end();
  }
}

migrate();
