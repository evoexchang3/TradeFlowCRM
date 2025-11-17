import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import * as schema from './shared/schema';

const newPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_hpksyzf6SXP8@ep-wandering-smoke-a8yw3qyw-pooler.eastus2.azure.neon.tech/neondb?sslmode=require&channel_binding=require'
});

const oldPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_oHTA4VnZB9xO@ep-shy-meadow-adqyzgor.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

const newDb = drizzle(newPool, { schema });
const oldDb = drizzle(oldPool, { schema });

async function restoreUsersAndTeams() {
  console.log('🔄 Restoring users and teams to OLD database...\n');
  
  try {
    // Get all users and teams from new database
    const allUsers = await newDb.select().from(schema.users);
    const allTeams = await newDb.select().from(schema.teams);
    
    console.log(`Found in NEW database:`);
    console.log(`  Users: ${allUsers.length}`);
    console.log(`  Teams: ${allTeams.length}`);
    
    // Get existing data in old database
    const existingUsers = await oldDb.select().from(schema.users);
    const existingTeams = await oldDb.select().from(schema.teams);
    const existingEmails = new Set(existingUsers.map(u => u.email));
    const existingTeamIds = new Set(existingTeams.map(t => t.id));
    
    console.log(`\nExisting in OLD database:`);
    console.log(`  Users: ${existingUsers.length}`);
    console.log(`  Teams: ${existingTeams.length}`);
    
    // Find users and teams to insert
    const usersToInsert = allUsers.filter(u => !existingEmails.has(u.email));
    const teamsToInsert = allTeams.filter(t => !existingTeamIds.has(t.id));
    
    console.log(`\nTo restore:`);
    console.log(`  New users: ${usersToInsert.length}`);
    console.log(`  New teams: ${teamsToInsert.length}`);
    
    // Step 1: Insert new teams without leader_id
    if (teamsToInsert.length > 0) {
      console.log('\n📋 Inserting new teams...');
      const teamsWithoutLeader = teamsToInsert.map(t => ({ ...t, leaderId: null }));
      await oldDb.insert(schema.teams).values(teamsWithoutLeader);
      console.log(`✓ ${teamsToInsert.length} teams inserted`);
    }
    
    // Step 2: Insert new users
    if (usersToInsert.length > 0) {
      console.log('\n👥 Inserting new users...');
      await oldDb.insert(schema.users).values(usersToInsert);
      console.log(`✓ ${usersToInsert.length} users inserted`);
    }
    
    // Step 3: Update team leaders for ALL teams (existing + new)
    console.log('\n📋 Updating team leaders...');
    const allOldUsers = await oldDb.select({ id: schema.users.id }).from(schema.users);
    const oldUserIds = new Set(allOldUsers.map(u => u.id));
    
    for (const team of allTeams) {
      if (team.leaderId && oldUserIds.has(team.leaderId)) {
        await oldDb.update(schema.teams)
          .set({ leaderId: team.leaderId })
          .where(eq(schema.teams.id, team.id));
      } else if (team.leaderId) {
        console.log(`  ⚠ Team "${team.name}" - leader not found in OLD database`);
      }
    }
    console.log(`✓ Team leaders updated`);
    
    // Verify final state
    const finalUsers = await oldDb.select().from(schema.users);
    const finalTeams = await oldDb.select().from(schema.teams);
    
    console.log('\n✅ OLD DATABASE - Final state:');
    console.log(`  Users: ${finalUsers.length}`);
    console.log(`  Teams: ${finalTeams.length}`);
    console.log(`  Clients: 0 (removed as requested)`);
    
    console.log('\n📋 All users in OLD database:');
    for (const user of finalUsers) {
      const roleResult = await oldPool.query('SELECT name FROM roles WHERE id = $1', [user.roleId]);
      const roleName = roleResult.rows[0]?.name || 'Unknown';
      console.log(`  - ${user.email} (${user.name}) - ${roleName}`);
    }
    
    console.log('\n📋 All teams in OLD database:');
    for (const team of finalTeams) {
      const leaderResult = await oldPool.query('SELECT name FROM users WHERE id = $1', [team.leaderId]);
      const leaderName = leaderResult.rows[0]?.name || 'None';
      console.log(`  - ${team.name} (Leader: ${leaderName})`);
    }
    
    console.log('\n✅ User and team restoration complete!');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    await newPool.end();
    await oldPool.end();
  }
}

restoreUsersAndTeams();
