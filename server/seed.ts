import bcrypt from 'bcrypt';
import { storage } from './storage';
import { db } from './db';
import { customStatuses } from '@shared/schema';

async function seed() {
  try {
    console.log('Starting database seed...');

    // Seed Custom Statuses first (if table is empty)
    const existingStatuses = await db.select().from(customStatuses).limit(1);
    if (existingStatuses.length === 0) {
      console.log('Seeding default custom statuses...');
      await db.insert(customStatuses).values([
        { name: 'New', color: '#3b82f6', icon: 'UserPlus', category: 'sales', sortOrder: 1, isActive: true },
        { name: 'Reassigned', color: '#f59e0b', icon: 'ArrowRightLeft', category: 'sales', sortOrder: 2, isActive: true },
        { name: 'Potential', color: '#10b981', icon: 'TrendingUp', category: 'sales', sortOrder: 3, isActive: true },
        { name: 'Low Potential', color: '#94a3b8', icon: 'TrendingDown', category: 'sales', sortOrder: 4, isActive: true },
        { name: 'Mid Potential', color: '#eab308', icon: 'Minus', category: 'sales', sortOrder: 5, isActive: true },
        { name: 'High Potential', color: '#22c55e', icon: 'Flame', category: 'sales', sortOrder: 6, isActive: true },
        { name: 'No Answer', color: '#6b7280', icon: 'PhoneOff', category: 'sales', sortOrder: 7, isActive: true },
        { name: 'Voicemail', color: '#8b5cf6', icon: 'Voicemail', category: 'sales', sortOrder: 8, isActive: true },
        { name: 'Callback Requested', color: '#f97316', icon: 'PhoneCall', category: 'sales', sortOrder: 9, isActive: true },
        { name: 'Not Interested', color: '#ef4444', icon: 'ThumbsDown', category: 'sales', sortOrder: 10, isActive: true },
        { name: 'Converted', color: '#059669', icon: 'CheckCircle', category: 'retention', sortOrder: 11, isActive: true },
        { name: 'Lost', color: '#dc2626', icon: 'XCircle', category: 'sales', sortOrder: 12, isActive: true },
      ]);
      console.log('✅ Default custom statuses created');
    } else {
      console.log('Custom statuses already exist, skipping...');
    }

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
