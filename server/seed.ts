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

    // Seed Department-Specific Roles (if they don't exist)
    const roles = await storage.getRoles();
    const existingRoleNames = roles.map(r => r.name);
    
    const departmentRoles = [
      { name: 'Administrator', description: 'Full system access with all permissions', permissions: ['*'] },
      { name: 'CRM Manager', description: 'Manages CRM operations across all departments', permissions: ['client.view', 'client.view_all', 'client.create', 'client.edit', 'client.delete', 'client.mark_ftd', 'trade.view', 'trade.create', 'trade.edit', 'trade.delete', 'balance.adjust', 'team.view', 'team.manage', 'kyc.view', 'kyc.edit', 'kyc.manage', 'user.view', 'role.view'] },
      { name: 'Sales Manager', description: 'Manages sales department and teams', permissions: ['client.view', 'client.view_all', 'client.create', 'client.edit', 'client.mark_ftd', 'trade.view', 'trade.create', 'team.view', 'team.manage', 'kyc.view', 'kyc.edit', 'kyc.manage'] },
      { name: 'Retention Manager', description: 'Manages retention department and teams', permissions: ['client.view', 'client.view_all', 'client.edit', 'trade.view', 'trade.create', 'team.view', 'team.manage', 'kyc.view', 'kyc.edit', 'kyc.manage'] },
      { name: 'Sales Agent', description: 'Handles sales leads and new client acquisition', permissions: ['client.view', 'client.create', 'client.edit', 'client.mark_ftd', 'trade.view', 'trade.create', 'kyc.view', 'kyc.fill'] },
      { name: 'Retention Agent', description: 'Manages existing clients and retention efforts', permissions: ['client.view', 'client.edit', 'trade.view', 'trade.create', 'kyc.view', 'kyc.edit'] },
      { name: 'Sales Team Leader', description: 'Leads sales team and manages sales operations', permissions: ['client.view', 'client.view_all', 'client.create', 'client.edit', 'client.mark_ftd', 'trade.view', 'trade.create', 'team.view', 'kyc.view', 'kyc.edit', 'kyc.manage'] },
      { name: 'Retention Team Leader', description: 'Leads retention team and manages client retention', permissions: ['client.view', 'client.view_all', 'client.edit', 'trade.view', 'trade.create', 'team.view', 'kyc.view', 'kyc.edit', 'kyc.manage'] },
    ];

    for (const roleData of departmentRoles) {
      const existingRole = roles.find(r => r.name === roleData.name);
      if (!existingRole) {
        await storage.createRole({
          name: roleData.name,
          description: roleData.description,
          permissions: roleData.permissions,
        });
        console.log(`✅ Created role: ${roleData.name}`);
      } else {
        // Update existing role with new permissions
        await storage.updateRole(existingRole.id, {
          description: roleData.description,
          permissions: roleData.permissions,
        });
        console.log(`✅ Updated role: ${roleData.name} with new permissions`);
      }
    }

    // Get the Administrator role
    const updatedRoles = await storage.getRoles();
    const adminRole = updatedRoles.find(r => r.name === 'Administrator');
    
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
