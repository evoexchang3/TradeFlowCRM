import { Pool } from 'pg';
import bcrypt from 'bcrypt';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function resetPassword() {
  console.log('Resetting admin password...\n');
  
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const result = await pool.query(
      `UPDATE users SET password = $1 WHERE email = 'apitwelve001@gmail.com' RETURNING email, name`,
      [hashedPassword]
    );
    
    if (result.rows.length > 0) {
      console.log(`✅ Password reset for: ${result.rows[0].email} (${result.rows[0].name})`);
      console.log(`   Email: apitwelve001@gmail.com`);
      console.log(`   Password: admin123`);
    } else {
      console.log('❌ Admin user not found');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

resetPassword();
