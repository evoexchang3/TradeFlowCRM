import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { inArray } from 'drizzle-orm';
import * as schema from './shared/schema';

const prodPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_oHTA4VnZB9xO@ep-shy-meadow-adqyzgor.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

const newPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_hpksyzf6SXP8@ep-wandering-smoke-a8yw3qyw-pooler.eastus2.azure.neon.tech/neondb?sslmode=require&channel_binding=require'
});

const prodDb = drizzle(prodPool, { schema });
const newDb = drizzle(newPool, { schema });

async function migrateAuditLogs() {
  console.log('Migrating audit_logs with FK filtering...\n');
  
  try {
    // Get valid user IDs from new database
    const validUsers = await newDb.select({ id: schema.users.id }).from(schema.users);
    const validUserIds = validUsers.map(u => u.id);
    console.log(`Valid user IDs: ${validUserIds.length}`);
    
    // Get all audit logs from production
    const allAuditLogs = await prodDb.select().from(schema.auditLogs);
    console.log(`Total audit logs in production: ${allAuditLogs.length}`);
    
    // Filter to only logs with valid user_id references
    const validAuditLogs = allAuditLogs.filter(log => 
      validUserIds.includes(log.userId)
    );
    console.log(`Valid audit logs (matching migrated users): ${validAuditLogs.length}`);
    console.log(`Skipping ${allAuditLogs.length - validAuditLogs.length} orphaned audit logs`);
    
    // Insert valid audit logs
    if (validAuditLogs.length > 0) {
      await newDb.insert(schema.auditLogs).values(validAuditLogs);
      console.log(`✅ ${validAuditLogs.length} audit logs migrated`);
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prodPool.end();
    await newPool.end();
  }
}

migrateAuditLogs();
