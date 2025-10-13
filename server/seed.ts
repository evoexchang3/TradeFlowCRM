import bcrypt from 'bcrypt';
import { storage } from './storage';

async function seed() {
  try {
    console.log('Starting database seed...');

    // Get the Administrator role
    const roles = await storage.getRoles();
    const adminRole = roles.find(r => r.name === 'Administrator');
    
    if (!adminRole) {
      throw new Error('Administrator role not found. Please create roles first.');
    }

    // Check if admin user already exists
    const existingAdmin = await storage.getUserByEmail('apitwelve001@gmail.com');
    if (existingAdmin) {
      console.log('Admin user already exists, skipping...');
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash('Admin123', 10);

    // Create the admin user
    const adminUser = await storage.createUser({
      email: 'apitwelve001@gmail.com',
      password: hashedPassword,
      name: 'System Administrator',
      roleId: adminRole.id,
      isActive: true,
      mustResetPassword: false,
    });

    console.log('✅ Default admin user created successfully');
    console.log('Email: apitwelve001@gmail.com');
    console.log('Password: Admin123');
    console.log('Role:', adminRole.name);

    // Create audit log
    await storage.createAuditLog({
      userId: adminUser.id,
      action: 'client_create',
      targetType: 'user',
      targetId: adminUser.id,
      details: { source: 'seed_script', role: 'Administrator' },
    });

    console.log('✅ Seed completed successfully');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  }
}

seed();
