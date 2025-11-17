import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
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
  console.log('🚀 Starting data migration...\n');
  
  try {
    // 1. Roles
    console.log('1/10 Migrating roles...');
    const roles = await prodDb.select().from(schema.roles);
    await newDb.delete(schema.roles);
    if (roles.length > 0) await newDb.insert(schema.roles).values(roles);
    console.log(`✓ ${roles.length} roles`);
    
    // 2. Teams (insert with NULL leader_id to break circular dependency)
    console.log('2/10 Migrating teams (phase 1)...');
    const teams = await prodDb.select().from(schema.teams);
    await newDb.delete(schema.teams);
    if (teams.length > 0) {
      const teamsWithoutLeader = teams.map(t => ({ ...t, leaderId: null }));
      await newDb.insert(schema.teams).values(teamsWithoutLeader);
    }
    console.log(`✓ ${teams.length} teams (temp)`);
    
    // 3. Users (can now reference teams)
    console.log('3/10 Migrating users...');
    const users = await prodDb.select().from(schema.users);
    await newDb.delete(schema.users);
    if (users.length > 0) await newDb.insert(schema.users).values(users);
    console.log(`✓ ${users.length} users`);
    
    // 4. Update teams with correct leader_id (phase 2)
    console.log('4/10 Updating team leaders...');
    for (const team of teams) {
      if (team.leaderId) {
        await newDb.update(schema.teams)
          .set({ leaderId: team.leaderId })
          .where(eq(schema.teams.id, team.id));
      }
    }
    console.log(`✓ Team leaders updated`);
    
    // 5. Clients
    console.log('5/10 Migrating clients...');
    const clients = await prodDb.select().from(schema.clients);
    await newDb.delete(schema.clients);
    if (clients.length > 0) await newDb.insert(schema.clients).values(clients);
    console.log(`✓ ${clients.length} clients`);
    
    // 6. Accounts
    console.log('6/10 Migrating accounts...');
    const accounts = await prodDb.select().from(schema.accounts);
    await newDb.delete(schema.accounts);
    if (accounts.length > 0) await newDb.insert(schema.accounts).values(accounts);
    console.log(`✓ ${accounts.length} accounts`);
    
    // 7. Subaccounts
    console.log('7/10 Migrating subaccounts...');
    const subaccounts = await prodDb.select().from(schema.subaccounts);
    if (subaccounts.length > 0) await newDb.insert(schema.subaccounts).values(subaccounts);
    console.log(`✓ ${subaccounts.length} subaccounts`);
    
    // 8. Transactions
    console.log('8/10 Migrating transactions...');
    const transactions = await prodDb.select().from(schema.transactions);
    if (transactions.length > 0) await newDb.insert(schema.transactions).values(transactions);
    console.log(`✓ ${transactions.length} transactions`);
    
    // 9. Orders
    console.log('9/10 Migrating orders...');
    const orders = await prodDb.select().from(schema.orders);
    if (orders.length > 0) await newDb.insert(schema.orders).values(orders);
    console.log(`✓ ${orders.length} orders`);
    
    // 10. Positions
    console.log('10/10 Migrating positions...');
    const positions = await prodDb.select().from(schema.positions);
    if (positions.length > 0) await newDb.insert(schema.positions).values(positions);
    console.log(`✓ ${positions.length} positions`);
    
    // Audit logs last
    console.log('Migrating audit_logs...');
    const auditLogs = await prodDb.select().from(schema.auditLogs);
    if (auditLogs.length > 0) await newDb.insert(schema.auditLogs).values(auditLogs);
    console.log(`✓ ${auditLogs.length} audit_logs`);
    
    console.log('\n✅ MIGRATION COMPLETE!');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    await prodPool.end();
    await newPool.end();
  }
}

migrate();
