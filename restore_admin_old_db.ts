import { Pool } from 'pg';
import bcrypt from 'bcrypt';

const oldPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_oHTA4VnZB9xO@ep-shy-meadow-adqyzgor.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function restoreAdmin() {
  console.log('Restoring admin user in OLD database...\n');
  
  try {
    // Get Administrator role ID
    const roleResult = await oldPool.query(`SELECT id FROM roles WHERE name = 'Administrator' LIMIT 1`);
    if (roleResult.rows.length === 0) {
      console.log('❌ Administrator role not found');
      return;
    }
    const adminRoleId = roleResult.rows[0].id;
    
    // Check if apitwelve001@gmail.com exists
    const existingUser = await oldPool.query(`SELECT id, email FROM users WHERE email = 'apitwelve001@gmail.com'`);
    
    const hashedPassword = await bcrypt.hash('Admin123', 10);
    
    if (existingUser.rows.length > 0) {
      // Update existing user
      await oldPool.query(
        `UPDATE users SET password = $1, name = 'System Administrator', role_id = $2 WHERE email = 'apitwelve001@gmail.com'`,
        [hashedPassword, adminRoleId]
      );
      console.log('✅ Updated existing admin user');
    } else {
      // Create new admin user
      await oldPool.query(`
        INSERT INTO users (id, email, password, name, role_id, is_active, must_reset_password, current_workload, max_workload, is_available)
        VALUES (gen_random_uuid(), 'apitwelve001@gmail.com', $1, 'System Administrator', $2, true, false, 0, 200, true)
      `, [hashedPassword, adminRoleId]);
      console.log('✅ Created new admin user');
    }
    
    // Verify
    const verifyResult = await oldPool.query(
      `SELECT u.email, u.name, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.email = 'apitwelve001@gmail.com'`
    );
    
    if (verifyResult.rows.length > 0) {
      const user = verifyResult.rows[0];
      console.log(`\n✅ OLD DATABASE - Admin user ready:`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Password: Admin123`);
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await oldPool.end();
  }
}

restoreAdmin();
