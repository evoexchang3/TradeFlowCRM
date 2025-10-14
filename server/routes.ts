import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import express from "express";
import bcrypt from "bcrypt";
import multer from "multer";
import { z } from "zod";
import crypto from "crypto";
import { storage } from "./storage";
import { twelveDataService } from "./services/twelve-data";
import { tradingEngine } from "./services/trading-engine";
import { authMiddleware, optionalAuth, generateToken, verifyToken, serviceTokenMiddleware, type AuthRequest } from "./middleware/auth";
import { previewImport, executeImport } from "./import";

// Helper to generate account number
function generateAccountNumber(): string {
  return 'ACC' + Date.now() + Math.floor(Math.random() * 1000);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Webhook endpoint MUST come before express.json() to preserve raw body for signature verification
  app.post("/api/webhooks/site", express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      const signature = req.headers['x-webhook-signature'] as string;
      const webhookSecret = process.env.WEBHOOK_SECRET;

      if (!webhookSecret) {
        console.error('[Webhook] WEBHOOK_SECRET not configured');
        return res.status(500).json({ error: 'Webhook secret not configured' });
      }

      if (!signature) {
        console.error('[Webhook] No signature provided');
        return res.status(401).json({ error: 'No signature provided' });
      }

      // Verify HMAC-SHA256 signature
      const rawBody = req.body.toString('utf8');
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.error('[Webhook] Invalid signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }

      // Parse the webhook payload
      const payload = JSON.parse(rawBody);
      const { event, data, timestamp } = payload;

      console.log(`[Webhook] Received event: ${event}`, data);

      // Handle different webhook event types
      switch (event) {
        case 'client.registered': {
          // Trading Platform notifies CRM of new client registration
          const { clientId, email, firstName, lastName, phone } = data;
          
          // Check if client already exists
          const existing = await storage.getClientByEmail(email);
          if (existing) {
            console.log(`[Webhook] Client ${email} already exists`);
            await storage.createAuditLog({
              action: 'webhook_received',
              targetType: 'client',
              targetId: existing.id,
              details: { event, source: 'trading_platform', status: 'duplicate' },
            });
            return res.json({ status: 'duplicate', clientId: existing.id });
          }

          // Create client in CRM
          const client = await storage.createClient({
            firstName,
            lastName,
            email,
            phone,
            kycStatus: 'pending',
            isActive: true,
            password: '', // No password needed - they login via Trading Platform
          });

          // Create account
          await storage.createAccount({
            clientId: client.id,
            accountNumber: generateAccountNumber(),
            currency: 'USD',
            balance: '0',
            equity: '0',
            margin: '0',
            freeMargin: '0',
            leverage: 100,
            isActive: true,
          });

          await storage.createAuditLog({
            action: 'webhook_received',
            targetType: 'client',
            targetId: client.id,
            details: { event, source: 'trading_platform', externalClientId: clientId },
          });

          return res.json({ status: 'created', clientId: client.id });
        }

        case 'deposit.completed': {
          // Trading Platform notifies CRM of completed deposit
          const { clientEmail, amount, currency, transactionId } = data;
          
          const client = await storage.getClientByEmail(clientEmail);
          if (!client) {
            console.error(`[Webhook] Client not found: ${clientEmail}`);
            return res.status(404).json({ error: 'Client not found' });
          }

          const accounts = await storage.getAccountsByClientId(client.id);
          if (accounts.length === 0) {
            console.error(`[Webhook] No account found for client: ${clientEmail}`);
            return res.status(404).json({ error: 'Account not found' });
          }

          const account = accounts[0];
          const subaccounts = await storage.getSubaccountsByAccountId(account.id);
          const mainSubaccount = subaccounts.find(s => s.name === 'Main') || subaccounts[0];

          if (!mainSubaccount) {
            console.error(`[Webhook] No subaccount found for account: ${account.id}`);
            return res.status(404).json({ error: 'Subaccount not found' });
          }

          // Update subaccount balance
          const newBalance = (parseFloat(mainSubaccount.balance) + parseFloat(amount)).toString();
          await storage.updateSubaccount(mainSubaccount.id, { balance: newBalance });

          await storage.createAuditLog({
            action: 'webhook_received',
            targetType: 'subaccount',
            targetId: mainSubaccount.id,
            details: { 
              event, 
              source: 'trading_platform', 
              amount, 
              currency, 
              transactionId,
              oldBalance: mainSubaccount.balance,
              newBalance,
            },
          });

          return res.json({ status: 'processed' });
        }

        case 'withdrawal.completed': {
          // Trading Platform notifies CRM of completed withdrawal
          const { clientEmail, amount, currency, transactionId } = data;
          
          const client = await storage.getClientByEmail(clientEmail);
          if (!client) {
            console.error(`[Webhook] Client not found: ${clientEmail}`);
            return res.status(404).json({ error: 'Client not found' });
          }

          const accounts = await storage.getAccountsByClientId(client.id);
          if (accounts.length === 0) {
            console.error(`[Webhook] No account found for client: ${clientEmail}`);
            return res.status(404).json({ error: 'Account not found' });
          }

          const account = accounts[0];
          const subaccounts = await storage.getSubaccountsByAccountId(account.id);
          const mainSubaccount = subaccounts.find(s => s.name === 'Main') || subaccounts[0];

          if (!mainSubaccount) {
            console.error(`[Webhook] No subaccount found for account: ${account.id}`);
            return res.status(404).json({ error: 'Subaccount not found' });
          }

          // Update subaccount balance
          const newBalance = (parseFloat(mainSubaccount.balance) - parseFloat(amount)).toString();
          await storage.updateSubaccount(mainSubaccount.id, { balance: newBalance });

          await storage.createAuditLog({
            action: 'webhook_received',
            targetType: 'subaccount',
            targetId: mainSubaccount.id,
            details: { 
              event, 
              source: 'trading_platform', 
              amount, 
              currency, 
              transactionId,
              oldBalance: mainSubaccount.balance,
              newBalance,
            },
          });

          return res.json({ status: 'processed' });
        }

        case 'kyc.updated': {
          // Trading Platform notifies CRM of KYC status change
          const { clientEmail, kycStatus, kycNotes } = data;
          
          const client = await storage.getClientByEmail(clientEmail);
          if (!client) {
            console.error(`[Webhook] Client not found: ${clientEmail}`);
            return res.status(404).json({ error: 'Client not found' });
          }

          await storage.updateClient(client.id, { 
            kycStatus: kycStatus as 'pending' | 'approved' | 'rejected',
            kycNotes: kycNotes,
          });

          await storage.createAuditLog({
            action: 'webhook_received',
            targetType: 'client',
            targetId: client.id,
            details: { 
              event, 
              source: 'trading_platform', 
              kycStatus,
              oldKycStatus: client.kycStatus,
            },
          });

          return res.json({ status: 'updated' });
        }

        case 'account.updated': {
          // Trading Platform notifies CRM of account changes
          const { clientEmail, leverage, balance, equity } = data;
          
          const client = await storage.getClientByEmail(clientEmail);
          if (!client) {
            console.error(`[Webhook] Client not found: ${clientEmail}`);
            return res.status(404).json({ error: 'Client not found' });
          }

          const accounts = await storage.getAccountsByClientId(client.id);
          if (accounts.length === 0) {
            console.error(`[Webhook] No account found for client: ${clientEmail}`);
            return res.status(404).json({ error: 'Account not found' });
          }

          const account = accounts[0];
          const updates: any = {};
          if (leverage !== undefined) updates.leverage = leverage;
          if (balance !== undefined) updates.balance = balance.toString();
          if (equity !== undefined) updates.equity = equity.toString();

          await storage.updateAccount(account.id, updates);

          await storage.createAuditLog({
            action: 'webhook_received',
            targetType: 'account',
            targetId: account.id,
            details: { 
              event, 
              source: 'trading_platform', 
              updates,
            },
          });

          return res.json({ status: 'updated' });
        }

        default: {
          console.warn(`[Webhook] Unknown event type: ${event}`);
          await storage.createAuditLog({
            action: 'webhook_received',
            targetType: 'system',
            targetId: 'webhook-handler',
            details: { event, source: 'trading_platform', status: 'unknown_event' },
          });
          return res.json({ status: 'unknown_event', event });
        }
      }
    } catch (error: any) {
      console.error('[Webhook] Error processing webhook:', error);
      await storage.createAuditLog({
        action: 'webhook_error',
        targetType: 'system',
        targetId: 'webhook-handler',
        details: { error: error.message, stack: error.stack },
      });
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Middleware for JSON parsing (AFTER webhook endpoint)
  app.use(express.json());

  // ===== AUTHENTICATION =====
  app.post("/api/register", async (req, res) => {
    try {
      const { firstName, lastName, email, password, phone } = req.body;

      // Check if client already exists
      const existing = await storage.getClientByEmail(email);
      if (existing) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create client
      const client = await storage.createClient({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        phone,
        kycStatus: 'pending',
        isActive: true,
      });

      // Create account
      await storage.createAccount({
        clientId: client.id,
        accountNumber: generateAccountNumber(),
        currency: 'USD',
        balance: '10000', // Demo balance
        equity: '10000',
        margin: '0',
        freeMargin: '10000',
        leverage: 100,
        isActive: true,
      });

      // Log audit
      await storage.createAuditLog({
        action: 'client_create',
        targetType: 'client',
        targetId: client.id,
        details: { source: 'public_registration' },
      });

      res.json({ success: true, clientId: client.id });
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      // Try user login first
      const user = await storage.getUserByEmail(email);
      if (user) {
        const valid = await bcrypt.compare(password, user.password);
        if (valid) {
          const token = generateToken({
            id: user.id,
            email: user.email,
            type: 'user',
            roleId: user.roleId || undefined
          });
          
          await storage.createAuditLog({
            userId: user.id,
            action: 'login',
            details: { userType: 'admin' },
          });
          
          return res.json({ 
            success: true, 
            token,
            user: { ...user, password: undefined }
          });
        }
      }

      // Try client login
      const client = await storage.getClientByEmail(email);
      if (client) {
        const valid = await bcrypt.compare(password, client.password);
        if (valid) {
          const token = generateToken({
            id: client.id,
            email: client.email,
            type: 'client'
          });
          
          return res.json({ 
            success: true, 
            token,
            client: { ...client, password: undefined }
          });
        }
      }

      res.status(401).json({ error: "Invalid credentials" });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== CLIENTS =====
  app.get("/api/clients", authMiddleware, async (req: AuthRequest, res) => {
    try {
      // Client type users cannot access this endpoint (they have their own portal)
      if (req.user?.type === 'client') {
        return res.status(403).json({ error: 'Unauthorized: Client access not allowed' });
      }

      // Get user's full details to check role and team
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      let clients = await storage.getClients();
      
      // Apply role-based filtering
      if (user.roleId) {
        const role = await storage.getRole(user.roleId);
        const roleName = role?.name?.toLowerCase();

        // Administrator and CRM Manager see all clients
        if (roleName === 'administrator' || roleName === 'crm manager') {
          // No filtering needed
        }
        // Team Leader sees only clients in their team
        else if (roleName === 'team leader') {
          clients = clients.filter(c => c.teamId === user.teamId);
        }
        // Agent sees only clients assigned to them
        else if (roleName === 'agent') {
          clients = clients.filter(c => c.assignedAgentId === user.id);
        }
        // Default: if role doesn't match known roles, show only assigned clients
        else {
          clients = clients.filter(c => c.assignedAgentId === user.id);
        }
      } else {
        // Users without a role see only clients assigned to them
        clients = clients.filter(c => c.assignedAgentId === user.id);
      }

      // Enrich clients with agent, team, and account information
      const enrichedClients = await Promise.all(clients.map(async (client) => {
        const assignedAgent = client.assignedAgentId ? await storage.getUser(client.assignedAgentId) : null;
        const team = client.teamId ? await storage.getTeam(client.teamId) : null;
        const account = await storage.getAccountByClientId(client.id);
        return {
          ...client,
          assignedAgent: assignedAgent ? { id: assignedAgent.id, name: assignedAgent.name } : null,
          team: team ? { id: team.id, name: team.name } : null,
          account: account || null,
        };
      }));

      res.json(enrichedClients);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/clients/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      const account = await storage.getAccountByClientId(client.id);
      const positions = await storage.getPositions({ accountId: account?.id });
      const transactions = await storage.getTransactions({ accountId: account?.id });

      res.json({ ...client, account, positions, transactions });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/clients/:id/accounts", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      const accounts = await storage.getAccountsByClientId(client.id);
      res.json(accounts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/clients", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = req.body;
      const hashedPassword = await bcrypt.hash(data.password || 'Welcome123!', 10);

      // Parse dateOfBirth if it's a string (e.g., "10.01.1990")
      let dateOfBirth = data.dateOfBirth;
      if (typeof dateOfBirth === 'string' && dateOfBirth) {
        // Try to parse various date formats
        const parts = dateOfBirth.split(/[.\-\/]/);
        if (parts.length === 3) {
          // Assume DD.MM.YYYY or DD-MM-YYYY or DD/MM/YYYY
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1; // JS months are 0-indexed
          const year = parseInt(parts[2]);
          dateOfBirth = new Date(year, month, day);
        } else {
          dateOfBirth = new Date(dateOfBirth);
        }
      }

      const client = await storage.createClient({
        ...data,
        dateOfBirth,
        password: hashedPassword,
        mustResetPassword: !data.password,
      });

      // Create account
      await storage.createAccount({
        clientId: client.id,
        accountNumber: generateAccountNumber(),
        currency: 'USD',
        balance: '10000',
        equity: '10000',
        isActive: true,
      });

      await storage.createAuditLog({
        action: 'client_create',
        targetType: 'client',
        targetId: client.id,
        details: data,
      });

      res.json(client);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/clients/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const updates = req.body;
      if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, 10);
        updates.mustResetPassword = true;
      }

      const client = await storage.updateClient(req.params.id, updates);

      await storage.createAuditLog({
        userId: req.user?.type === 'user' ? req.user.id : undefined,
        clientId: req.user?.type === 'client' ? req.user.id : undefined,
        action: 'client_edit',
        targetType: 'client',
        targetId: client.id,
        details: updates,
      });

      res.json(client);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== CLIENT ASSIGNMENT =====
  app.patch("/api/clients/:id/assign", authMiddleware, async (req: AuthRequest, res) => {
    try {
      // Only admin and CRM Manager can assign clients
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: User access required' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ error: 'Unauthorized: No role assigned' });
      }

      const role = await storage.getRole(user.roleId);
      const permissions = (role?.permissions as string[]) || [];
      
      if (!permissions.includes('client.edit') && role?.name?.toLowerCase() !== 'administrator') {
        return res.status(403).json({ error: 'Unauthorized: Insufficient permissions' });
      }

      const { assignedAgentId, teamId } = req.body;
      
      // Only update fields that are provided in the request
      const updates: any = {};
      if (assignedAgentId !== undefined) updates.assignedAgentId = assignedAgentId || null;
      if (teamId !== undefined) updates.teamId = teamId || null;

      const client = await storage.updateClient(req.params.id, updates);

      await storage.createAuditLog({
        userId: req.user?.id,
        action: 'client_edit',
        targetType: 'client',
        targetId: client.id,
        details: { assignedAgentId, teamId },
      });

      res.json(client);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/clients/bulk-assign", authMiddleware, async (req: AuthRequest, res) => {
    try {
      // Only admin and CRM Manager can bulk assign clients
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: User access required' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ error: 'Unauthorized: No role assigned' });
      }

      const role = await storage.getRole(user.roleId);
      const permissions = (role?.permissions as string[]) || [];
      
      if (!permissions.includes('client.edit') && role?.name?.toLowerCase() !== 'administrator') {
        return res.status(403).json({ error: 'Unauthorized: Insufficient permissions' });
      }

      const { clientIds, assignedAgentId, teamId } = req.body;
      
      if (!clientIds || !Array.isArray(clientIds)) {
        return res.status(400).json({ error: "clientIds array is required" });
      }

      const updates: any = {};
      if (assignedAgentId !== undefined) updates.assignedAgentId = assignedAgentId || null;
      if (teamId !== undefined) updates.teamId = teamId || null;

      const results = await Promise.all(
        clientIds.map(id => storage.updateClient(id, updates))
      );

      await storage.createAuditLog({
        userId: req.user?.id,
        action: 'client_edit',
        targetType: 'bulk_assignment',
        details: { clientIds, assignedAgentId, teamId },
      });

      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== CLIENT TRANSFER =====
  app.post("/api/clients/:id/transfer", authMiddleware, async (req: AuthRequest, res) => {
    try {
      // Only staff can transfer clients
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: User access required' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ error: 'Unauthorized: No role assigned' });
      }

      const role = await storage.getRole(user.roleId);
      const permissions = (role?.permissions as string[]) || [];
      
      // Require client.edit permission or administrator role
      if (!permissions.includes('client.edit') && role?.name?.toLowerCase() !== 'administrator') {
        return res.status(403).json({ error: 'Unauthorized: Insufficient permissions to transfer clients' });
      }

      const { newAgentId, newTeamId, transferReason } = req.body;
      
      // Validate that at least one assignment is provided
      if (newAgentId === undefined && newTeamId === undefined) {
        return res.status(400).json({ error: "Either newAgentId or newTeamId must be provided" });
      }

      // Validate transfer reason
      if (!transferReason || transferReason.trim() === '') {
        return res.status(400).json({ error: "Transfer reason is required" });
      }

      // Get current client to check previous assignment
      const currentClient = await storage.getClient(req.params.id);
      if (!currentClient) {
        return res.status(404).json({ error: "Client not found" });
      }

      // Build updates object
      const updates: any = {
        status: 'reassigned', // Automatically change status to reassigned
      };
      
      if (newAgentId !== undefined) updates.assignedAgentId = newAgentId || null;
      if (newTeamId !== undefined) updates.teamId = newTeamId || null;

      // Update client
      const updatedClient = await storage.updateClient(req.params.id, updates);

      // Create audit log with transfer details
      await storage.createAuditLog({
        userId: req.user.id,
        action: 'client_transfer',
        targetType: 'client',
        targetId: updatedClient.id,
        details: {
          previousAgentId: currentClient.assignedAgentId,
          previousTeamId: currentClient.teamId,
          newAgentId: updates.assignedAgentId,
          newTeamId: updates.teamId,
          transferReason,
          statusChangedTo: 'reassigned',
        },
      });

      // Optional: Create a comment about the transfer
      await storage.createClientComment({
        clientId: updatedClient.id,
        userId: req.user.id,
        comment: `Client transferred. Reason: ${transferReason}`,
      });

      res.json(updatedClient);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== CLIENT COMMENTS =====
  app.get("/api/clients/:id/comments", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const comments = await storage.getClientComments(req.params.id);
      
      // Enrich comments with user information
      const enrichedComments = await Promise.all(comments.map(async (comment) => {
        const user = comment.userId ? await storage.getUser(comment.userId) : null;
        return {
          ...comment,
          user: user ? { id: user.id, name: user.name } : null,
        };
      }));
      
      res.json(enrichedComments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/clients/:id/comments", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Only staff can add comments' });
      }

      const comment = await storage.createClientComment({
        clientId: req.params.id,
        userId: req.user.id,
        comment: req.body.comment,
      });

      res.json(comment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/comments/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Only staff can edit comments' });
      }

      // Check role - only CRM Manager and Team Leader can edit
      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ error: 'Unauthorized: No role assigned' });
      }

      const role = await storage.getRole(user.roleId);
      const roleName = role?.name?.toLowerCase();
      
      if (roleName !== 'crm manager' && roleName !== 'team leader' && roleName !== 'administrator') {
        return res.status(403).json({ error: 'Unauthorized: Only CRM Manager, Team Leader, or Administrator can edit comments' });
      }

      const comment = await storage.updateClientComment(req.params.id, {
        comment: req.body.comment,
      });

      res.json(comment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/comments/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Only staff can delete comments' });
      }

      // Check role - only CRM Manager and Team Leader can delete
      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ error: 'Unauthorized: No role assigned' });
      }

      const role = await storage.getRole(user.roleId);
      const roleName = role?.name?.toLowerCase();
      
      if (roleName !== 'crm manager' && roleName !== 'team leader' && roleName !== 'administrator') {
        return res.status(403).json({ error: 'Unauthorized: Only CRM Manager, Team Leader, or Administrator can delete comments' });
      }

      await storage.deleteClientComment(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== SUBACCOUNTS =====
  app.get("/api/subaccounts", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const accountId = req.query.accountId as string;
      if (!accountId) {
        return res.status(400).json({ error: "accountId query parameter required" });
      }

      // Verify account ownership or admin access
      const account = await storage.getAccount(accountId);
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }

      if (req.user?.type === 'client') {
        const client = await storage.getClientByEmail(req.user.email);
        if (client?.id !== account.clientId) {
          return res.status(403).json({ error: "Unauthorized: Cannot access other client's subaccounts" });
        }
      } else if (req.user?.type === 'user') {
        // Staff members need permission
        const user = await storage.getUser(req.user.id);
        if (!user || !user.roleId) {
          return res.status(403).json({ error: 'Unauthorized: No role assigned' });
        }

        const role = await storage.getRole(user.roleId);
        const permissions = (role?.permissions as string[]) || [];
        
        if (!permissions.includes('balance.view') && role?.name?.toLowerCase() !== 'administrator') {
          return res.status(403).json({ error: 'Unauthorized: Insufficient permissions' });
        }
      }
      
      const subaccounts = await storage.getSubaccountsByAccountId(accountId);
      res.json(subaccounts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/subaccounts", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { accountId, name, currency = 'USD' } = req.body;
      
      if (!accountId || !name) {
        return res.status(400).json({ error: "accountId and name are required" });
      }

      // Verify account ownership or admin access
      const account = await storage.getAccount(accountId);
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }

      if (req.user?.type === 'client') {
        const client = await storage.getClientByEmail(req.user.email);
        if (client?.id !== account.clientId) {
          return res.status(403).json({ error: "Unauthorized: Cannot create subaccounts for other clients" });
        }
      } else if (req.user?.type === 'user') {
        // Staff members need permission
        const user = await storage.getUser(req.user.id);
        if (!user || !user.roleId) {
          return res.status(403).json({ error: 'Unauthorized: No role assigned' });
        }

        const role = await storage.getRole(user.roleId);
        const permissions = (role?.permissions as string[]) || [];
        
        if (!permissions.includes('balance.adjust') && role?.name?.toLowerCase() !== 'administrator') {
          return res.status(403).json({ error: 'Unauthorized: Insufficient permissions' });
        }
      }

      const subaccount = await storage.createSubaccount({
        accountId,
        name,
        currency,
        balance: '0',
        equity: '0',
        margin: '0',
        freeMargin: '0',
        marginLevel: '0',
        isDefault: false,
        isActive: true,
      });

      res.json(subaccount);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/subaccounts/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      // Get the subaccount to verify ownership
      const subaccount = await storage.getSubaccount(req.params.id);
      if (!subaccount) {
        return res.status(404).json({ error: "Subaccount not found" });
      }

      const account = await storage.getAccount(subaccount.accountId);
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }

      // Verify ownership or permission
      if (req.user?.type === 'client') {
        const client = await storage.getClientByEmail(req.user.email);
        if (client?.id !== account.clientId) {
          return res.status(403).json({ error: "Unauthorized: Cannot modify other client's subaccounts" });
        }
      } else if (req.user?.type === 'user') {
        // Staff members need permission
        const user = await storage.getUser(req.user.id);
        if (!user || !user.roleId) {
          return res.status(403).json({ error: 'Unauthorized: No role assigned' });
        }

        const role = await storage.getRole(user.roleId);
        const permissions = (role?.permissions as string[]) || [];
        
        if (!permissions.includes('balance.adjust') && role?.name?.toLowerCase() !== 'administrator') {
          return res.status(403).json({ error: 'Unauthorized: Insufficient permissions' });
        }
      }

      // Whitelist allowed fields (prevent balance/accountId manipulation)
      const allowedUpdates: any = {};
      if (req.body.name !== undefined) allowedUpdates.name = req.body.name;
      if (req.body.isDefault !== undefined) allowedUpdates.isDefault = req.body.isDefault;
      if (req.body.isActive !== undefined) allowedUpdates.isActive = req.body.isActive;

      const updated = await storage.updateSubaccount(req.params.id, allowedUpdates);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Internal Transfers
  app.post("/api/subaccounts/transfer", authMiddleware, async (req: AuthRequest, res) => {
    try {
      // Validate payload with Zod
      const transferSchema = z.object({
        fromSubaccountId: z.string().min(1),
        toSubaccountId: z.string().min(1),
        amount: z.union([z.string(), z.number()]).refine(
          (val) => {
            const num = Number(val);
            return Number.isFinite(num) && num > 0;
          },
          { message: "Amount must be a valid number greater than zero" }
        ),
        notes: z.string().optional(),
      });

      const validation = transferSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      const { fromSubaccountId, toSubaccountId, amount, notes } = validation.data;
      const transferAmount = Number(amount);

      // Get both subaccounts
      const fromSubaccount = await storage.getSubaccount(fromSubaccountId);
      const toSubaccount = await storage.getSubaccount(toSubaccountId);

      if (!fromSubaccount || !toSubaccount) {
        return res.status(404).json({ error: "Subaccount not found" });
      }

      // Verify they belong to the same account
      if (fromSubaccount.accountId !== toSubaccount.accountId) {
        return res.status(400).json({ error: "Transfers can only occur between subaccounts of the same account" });
      }

      const account = await storage.getAccount(fromSubaccount.accountId);
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }

      // Authorization check - STAFF ONLY (no client-initiated transfers to avoid FK issues)
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Only staff members can initiate transfers' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ error: 'Unauthorized: No role assigned' });
      }

      const role = await storage.getRole(user.roleId);
      const permissions = (role?.permissions as string[]) || [];

      if (!permissions.includes('balance.adjust') && role?.name?.toLowerCase() !== 'administrator') {
        return res.status(403).json({ error: 'Unauthorized: Insufficient permissions' });
      }

      const userId = user.id;

      try {
        // Create transfer and execute atomically - both success or failure are persisted
        const transfer = await storage.createInternalTransfer({
          fromSubaccountId,
          toSubaccountId,
          amount: transferAmount.toFixed(2), // Use validated amount with fixed precision
          status: 'pending',
          notes: notes || null,
          userId,
          completedAt: null,
        });

        // Execute the transfer (updates status to completed or rejected)
        const result = await storage.executeInternalTransfer(transfer.id);

        // Log audit trail for both success and failure
        await storage.createAuditLog({
          userId,
          action: 'balance_adjust',
          details: { 
            type: 'internal_transfer',
            transferId: result.id,
            fromSubaccountId, 
            toSubaccountId, 
            amount: transferAmount.toFixed(2),
            status: result.status
          },
          ipAddress: req.ip || 'unknown',
        });

        if (result.status === 'rejected') {
          return res.status(400).json({ error: 'Insufficient balance', transfer: result });
        }

        res.json(result);
      } catch (error: any) {
        // Log failed transfer attempt (even if no transfer row created)
        await storage.createAuditLog({
          userId,
          action: 'balance_adjust',
          details: { 
            type: 'internal_transfer_failed',
            fromSubaccountId, 
            toSubaccountId, 
            amount: transferAmount.toFixed(2),
            error: error.message
          },
          ipAddress: req.ip || 'unknown',
        });
        
        res.status(400).json({ error: error.message });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/internal-transfers", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { accountId } = req.query;

      if (!accountId || typeof accountId !== 'string') {
        return res.status(400).json({ error: "accountId query parameter is required" });
      }

      // Verify account access
      const account = await storage.getAccount(accountId);
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }

      if (req.user?.type === 'client') {
        const client = await storage.getClientByEmail(req.user.email);
        if (client?.id !== account.clientId) {
          return res.status(403).json({ error: "Unauthorized: Cannot view transfers for other clients" });
        }
      } else if (req.user?.type === 'user') {
        const user = await storage.getUser(req.user.id);
        if (!user || !user.roleId) {
          return res.status(403).json({ error: 'Unauthorized: No role assigned' });
        }

        const role = await storage.getRole(user.roleId);
        const permissions = (role?.permissions as string[]) || [];

        if (!permissions.includes('balance.view') && role?.name?.toLowerCase() !== 'administrator') {
          return res.status(403).json({ error: 'Unauthorized: Insufficient permissions' });
        }
      }

      const transfers = await storage.getInternalTransfers({ accountId });
      res.json(transfers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== USER ACCOUNT =====
  app.get("/api/me", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type === 'user') {
        const user = await storage.getUserByEmail(req.user.email);
        res.json({ user: { ...user, password: undefined } });
      } else {
        const client = await storage.getClientByEmail(req.user!.email);
        const account = await storage.getAccountByClientId(client!.id);
        res.json({ client: { ...client, password: undefined }, account });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/users", authMiddleware, async (req: AuthRequest, res) => {
    try {
      // Only staff can access user list
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff access required' });
      }

      const users = await storage.getUsers();
      // Remove passwords from response
      const sanitizedUsers = users.map(user => ({
        ...user,
        password: undefined
      }));
      res.json(sanitizedUsers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/users/agents", authMiddleware, async (req: AuthRequest, res) => {
    try {
      // Only staff can access agents list
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff access required' });
      }

      const users = await storage.getUsers();
      // Filter to only users with roles (agents) and remove passwords
      const agents = users
        .filter(user => user.roleId)
        .map(user => ({
          ...user,
          password: undefined
        }));
      res.json(agents);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/users", authMiddleware, async (req: AuthRequest, res) => {
    try {
      // Only admin can create users
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff access required' });
      }

      // Check role
      const userRole = await storage.getRole(req.user.roleId!);
      if (userRole?.name?.toLowerCase() !== 'administrator') {
        return res.status(403).json({ error: 'Unauthorized: Administrator access required' });
      }

      const { firstName, lastName, email, password, roleId, teamId } = req.body;

      // Validate required fields
      if (!firstName || !lastName || !email || !password || !roleId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      const existingClient = await storage.getClientByEmail(email);
      if (existingUser || existingClient) {
        return res.status(400).json({ error: 'Email already in use' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const newUser = await storage.createUser({
        name: `${firstName} ${lastName}`,
        email,
        password: hashedPassword,
        roleId,
        teamId: teamId || null,
        isActive: true,
      });

      // Audit log
      await storage.createAuditLog({
        userId: req.user.id,
        action: 'client_create',
        targetType: 'user',
        targetId: newUser.id,
        details: { createdBy: req.user.email, role: userRole.name },
      });

      res.json({ ...newUser, password: undefined });
    } catch (error: any) {
      console.error('Create user error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/users/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      // Only admin can update users
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff access required' });
      }

      const userRole = await storage.getRole(req.user.roleId!);
      if (userRole?.name?.toLowerCase() !== 'administrator') {
        return res.status(403).json({ error: 'Unauthorized: Administrator access required' });
      }

      const { id } = req.params;
      const { firstName, lastName, email, roleId, teamId, isActive } = req.body;

      // Get existing user
      const existingUser = await storage.getUser(id);
      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // If email is changing, check for duplicates
      if (email && email !== existingUser.email) {
        const duplicate = await storage.getUserByEmail(email);
        if (duplicate) {
          return res.status(400).json({ error: 'Email already in use' });
        }
      }

      // Update user
      const updates: any = {};
      if (firstName !== undefined && lastName !== undefined) {
        updates.name = `${firstName} ${lastName}`;
      }
      if (email !== undefined) updates.email = email;
      if (roleId !== undefined) updates.roleId = roleId;
      if (teamId !== undefined) updates.teamId = teamId;
      if (isActive !== undefined) updates.isActive = isActive;

      const updatedUser = await storage.updateUser(id, updates);

      // Audit log
      await storage.createAuditLog({
        userId: req.user.id,
        action: 'client_edit',
        targetType: 'user',
        targetId: id,
        details: { changes: updates, updatedBy: req.user.email },
      });

      res.json({ ...updatedUser, password: undefined });
    } catch (error: any) {
      console.error('Update user error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/users/:id/reset-password", authMiddleware, async (req: AuthRequest, res) => {
    try {
      // Only admin can reset passwords
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff access required' });
      }

      const userRole = await storage.getRole(req.user.roleId!);
      if (userRole?.name?.toLowerCase() !== 'administrator') {
        return res.status(403).json({ error: 'Unauthorized: Administrator access required' });
      }

      const { id } = req.params;
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user password
      await storage.updateUser(id, { password: hashedPassword });

      // Audit log
      await storage.createAuditLog({
        userId: req.user.id,
        action: 'client_edit',
        targetType: 'user',
        targetId: id,
        details: { action: 'password_reset', resetBy: req.user.email },
      });

      res.json({ success: true, message: 'Password reset successfully' });
    } catch (error: any) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== TRADING =====
  app.post("/api/orders", authMiddleware, async (req: AuthRequest, res) => {
    try {
      // For clients, get their account. For admin users, they can specify accountId
      let accountId = req.body.accountId;
      let initiatorType: 'client' | 'agent' | 'team_leader' | 'crm_manager' | 'admin' = 'client';
      let initiatorId: string | undefined;
      
      if (req.user?.type === 'client') {
        const client = await storage.getClientByEmail(req.user.email);
        const account = await storage.getAccountByClientId(client!.id);
        if (!account) {
          return res.status(400).json({ error: "No account found for client" });
        }
        accountId = account.id;
        initiatorType = 'client';
        initiatorId = undefined; // Client trading for themselves
      } else {
        // Staff user trading for a client
        if (!accountId) {
          return res.status(400).json({ error: "accountId required for staff users" });
        }
        
        // Determine initiator type from user role
        const user = await storage.getUser(req.user!.id);
        if (user?.roleId) {
          const role = await storage.getRole(user.roleId);
          const roleName = role?.name?.toLowerCase();
          
          if (roleName === 'administrator') {
            initiatorType = 'admin';
          } else if (roleName === 'crm manager') {
            initiatorType = 'crm_manager';
          } else if (roleName === 'team leader') {
            initiatorType = 'team_leader';
          } else if (roleName === 'agent') {
            initiatorType = 'agent';
          }
        }
        initiatorId = req.user!.id;
      }

      const order = await tradingEngine.placeOrder({
        ...req.body,
        accountId,
        initiatorType,
        initiatorId,
      });

      await storage.createAuditLog({
        userId: req.user?.type === 'user' ? req.user.id : undefined,
        clientId: req.user?.type === 'client' ? req.user.id : undefined,
        action: 'trade_create',
        targetType: 'order',
        targetId: order.id,
        details: req.body,
      });

      res.json(order);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/orders", authMiddleware, async (req: AuthRequest, res) => {
    try {
      let accountId = req.query.accountId as string;
      
      // For clients, only show their own orders
      if (req.user?.type === 'client') {
        const client = await storage.getClientByEmail(req.user.email);
        const account = await storage.getAccountByClientId(client!.id);
        accountId = account?.id || '';
      }

      const orders = await storage.getOrders({ 
        accountId,
        status: (req.query.status as string) || 'pending' 
      });
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/orders/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      // Verify order ownership
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // For clients, verify they own this order
      if (req.user?.type === 'client') {
        const client = await storage.getClientByEmail(req.user.email);
        const account = await storage.getAccountByClientId(client!.id);
        if (order.accountId !== account?.id) {
          return res.status(403).json({ error: "Unauthorized to cancel this order" });
        }
      }

      const cancelledOrder = await tradingEngine.cancelOrder(req.params.id);

      await storage.createAuditLog({
        userId: req.user?.type === 'user' ? req.user.id : undefined,
        clientId: req.user?.type === 'client' ? req.user.id : undefined,
        action: 'trade_cancel',
        targetType: 'order',
        targetId: cancelledOrder.id,
        details: {},
      });

      res.json(cancelledOrder);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/positions", authMiddleware, async (req: AuthRequest, res) => {
    try {
      let accountId = req.query.accountId as string;
      
      // For clients, only show their own positions
      if (req.user?.type === 'client') {
        const client = await storage.getClientByEmail(req.user.email);
        const account = await storage.getAccountByClientId(client!.id);
        accountId = account?.id || '';
      }

      const positions = await storage.getPositions({ 
        accountId,
        status: (req.query.status as string) || 'open' 
      });
      res.json(positions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/positions/:id/close", authMiddleware, async (req: AuthRequest, res) => {
    try {
      // Verify position ownership
      const position = await storage.getPosition(req.params.id);
      if (!position) {
        return res.status(404).json({ error: "Position not found" });
      }

      // For clients, verify they own this position
      if (req.user?.type === 'client') {
        const client = await storage.getClientByEmail(req.user.email);
        const account = await storage.getAccountByClientId(client!.id);
        if (position.accountId !== account?.id) {
          return res.status(403).json({ error: "Unauthorized to close this position" });
        }
      }

      const { quantity } = req.body;
      const closedPosition = await tradingEngine.closePosition(req.params.id, quantity);

      await storage.createAuditLog({
        userId: req.user?.type === 'user' ? req.user.id : undefined,
        clientId: req.user?.type === 'client' ? req.user.id : undefined,
        action: 'trade_close',
        targetType: 'position',
        targetId: closedPosition.id,
        details: { quantity },
      });

      res.json(closedPosition);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/positions/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      // Verify position ownership
      const position = await storage.getPosition(req.params.id);
      if (!position) {
        return res.status(404).json({ error: "Position not found" });
      }

      // For clients, verify they own this position
      if (req.user?.type === 'client') {
        const client = await storage.getClientByEmail(req.user.email);
        const account = await storage.getAccountByClientId(client!.id);
        if (position.accountId !== account?.id) {
          return res.status(403).json({ error: "Unauthorized to modify this position" });
        }
      }

      const modifiedPosition = await tradingEngine.modifyPosition(req.params.id, req.body);

      await storage.createAuditLog({
        userId: req.user?.type === 'user' ? req.user.id : undefined,
        clientId: req.user?.type === 'client' ? req.user.id : undefined,
        action: 'trade_edit',
        targetType: 'position',
        targetId: modifiedPosition.id,
        details: req.body,
      });

      res.json(modifiedPosition);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== MARKET DATA =====
  app.get("/api/market-data/:symbol", async (req, res) => {
    try {
      const quote = await twelveDataService.getQuote(req.params.symbol);
      res.json(quote);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/candles/:symbol", async (req, res) => {
    try {
      const { interval = '1h', count = 100 } = req.query;
      const candles = await twelveDataService.getCandles(
        req.params.symbol,
        interval as string,
        parseInt(count as string)
      );
      res.json(candles);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== TRANSACTIONS =====
  app.get("/api/transactions", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const transactions = await storage.getTransactions();
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/transactions", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const transaction = await storage.createTransaction(req.body);
      res.json(transaction);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== ROLES =====
  app.get("/api/roles", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const roles = await storage.getRoles();
      res.json(roles);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/roles/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const role = await storage.getRole(req.params.id);
      if (!role) {
        return res.status(404).json({ error: "Role not found" });
      }
      res.json(role);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/roles", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const role = await storage.createRole(req.body);

      await storage.createAuditLog({
        action: 'role_create',
        targetType: 'role',
        targetId: role.id,
        details: req.body,
      });

      res.json(role);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== TEAMS =====
  app.get("/api/teams", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const teams = await storage.getTeams();
      res.json(teams);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/teams/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const team = await storage.getTeam(req.params.id);
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }
      
      let teamWithLeader: any = { ...team };
      if (team.leaderId) {
        const leader = await storage.getUser(team.leaderId);
        if (leader) {
          const { password, ...sanitizedLeader } = leader;
          teamWithLeader.leader = sanitizedLeader;
        }
      }
      
      res.json(teamWithLeader);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/teams", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const team = await storage.createTeam(req.body);
      res.json(team);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== AUDIT LOGS =====
  app.get("/api/audit-logs", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const logs = await storage.getAuditLogs();
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== IMPORT/EXPORT =====
  const upload = multer({ storage: multer.memoryStorage() });

  app.post("/api/import/preview", authMiddleware, upload.single('file'), async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const fileContent = req.file.buffer.toString('utf-8');
      const type = req.body.type || 'clients';
      const preview = previewImport(fileContent, type);

      res.json(preview);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/import/execute", authMiddleware, upload.single('file'), async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const fileContent = req.file.buffer.toString('utf-8');
      const type = req.body.type || 'clients';
      const mapping = JSON.parse(req.body.mapping || '{}');
      
      console.log('Import execute - mapping:', mapping);

      const result = await executeImport(fileContent, type, mapping, req.user?.id);

      if (result.errorCount > 0 && result.successCount === 0) {
        return res.status(400).json({ 
          error: "Import failed",
          errors: result.errors,
          successCount: result.successCount,
          errorCount: result.errorCount,
        });
      }

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== DASHBOARD STATS =====
  app.get("/api/dashboard/stats", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const clients = await storage.getClients();
      const positions = await storage.getPositions({ status: 'open' });

      res.json({
        totalClients: clients.length,
        activePositions: positions.length,
        totalVolume: 1250000,
        activeTrades: positions.length,
        recentActivity: [],
        topPerformers: [],
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== METRICS API =====
  app.get("/api/metrics/assignments", authMiddleware, async (req: AuthRequest, res) => {
    try {
      // Block client-type users from accessing staff metrics
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff access required' });
      }

      // Get user's role for filtering
      const user = await storage.getUser(req.user!.id);
      let clients = await storage.getClients();
      
      // Apply role-based filtering (same as GET /api/clients)
      if (user?.roleId) {
        const role = await storage.getRole(user.roleId);
        const roleName = role?.name?.toLowerCase();

        if (roleName === 'team leader') {
          clients = clients.filter(c => c.teamId === user.teamId);
        } else if (roleName === 'agent') {
          clients = clients.filter(c => c.assignedAgentId === user.id);
        }
      }

      const teams = await storage.getTeams();
      const users = await storage.getUsers();

      // Total counts
      const totalClients = clients.length;
      const assignedClients = clients.filter(c => c.assignedAgentId).length;
      const unassignedClients = totalClients - assignedClients;
      const clientsWithTeam = clients.filter(c => c.teamId).length;
      const clientsWithoutTeam = totalClients - clientsWithTeam;

      // Breakdown by status
      const byStatus = clients.reduce((acc: any, client: any) => {
        const status = client.status || 'new';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      // Breakdown by team
      const byTeam = clients.reduce((acc: any, client: any) => {
        if (client.teamId) {
          const team = teams.find((t: any) => t.id === client.teamId);
          const teamName = team?.name || 'Unknown Team';
          if (!acc[client.teamId]) {
            acc[client.teamId] = { id: client.teamId, name: teamName, count: 0 };
          }
          acc[client.teamId].count++;
        }
        return acc;
      }, {});

      // Breakdown by agent
      const byAgent = clients.reduce((acc: any, client: any) => {
        if (client.assignedAgentId) {
          const agent = users.find((u: any) => u.id === client.assignedAgentId);
          const agentName = agent?.name || 'Unknown Agent';
          if (!acc[client.assignedAgentId]) {
            acc[client.assignedAgentId] = { id: client.assignedAgentId, name: agentName, count: 0 };
          }
          acc[client.assignedAgentId].count++;
        }
        return acc;
      }, {});

      res.json({
        totalClients,
        assignedClients,
        unassignedClients,
        clientsWithTeam,
        clientsWithoutTeam,
        byStatus,
        byTeam: Object.values(byTeam).sort((a: any, b: any) => b.count - a.count),
        byAgent: Object.values(byAgent).sort((a: any, b: any) => b.count - a.count),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/metrics/financials", authMiddleware, async (req: AuthRequest, res) => {
    try {
      // Block client-type users from accessing staff metrics
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff access required' });
      }

      // Get user's role for filtering (same logic as assignments)
      const user = await storage.getUser(req.user!.id);
      let clients = await storage.getClients();
      
      // Apply role-based filtering
      if (user?.roleId) {
        const role = await storage.getRole(user.roleId);
        const roleName = role?.name?.toLowerCase();

        if (roleName === 'team leader') {
          clients = clients.filter(c => c.teamId === user.teamId);
        } else if (roleName === 'agent') {
          clients = clients.filter(c => c.assignedAgentId === user.id);
        }
      }

      const teams = await storage.getTeams();
      const users = await storage.getUsers();
      const accounts = await storage.getAccounts();
      const allSubaccounts = await storage.getSubaccounts();
      const allTransactions = await storage.getTransactions();

      // Get client IDs for filtering
      const clientIds = new Set(clients.map(c => c.id));

      // Filter accounts and subaccounts for these clients
      const clientAccounts = accounts.filter(a => clientIds.has(a.clientId));
      const accountIds = new Set(clientAccounts.map(a => a.id));
      const subaccounts = allSubaccounts.filter(s => accountIds.has(s.accountId));
      const subaccountIds = new Set(subaccounts.map(s => s.id));

      // Filter transactions for these subaccounts
      const transactions = allTransactions.filter(t => subaccountIds.has(t.subaccountId));

      // Calculate aggregates
      const totalBalance = clientAccounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
      const totalEquity = clientAccounts.reduce((sum, acc) => sum + Number(acc.equity), 0);
      
      const deposits = transactions
        .filter(t => t.type === 'deposit')
        .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
      
      const withdrawals = transactions
        .filter(t => t.type === 'withdrawal')
        .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

      // Trading volume (sum of all trade amounts)
      const tradingVolume = transactions
        .filter(t => t.type === 'trade')
        .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

      // Breakdown by team
      const byTeam = clients.reduce((acc: any, client: any) => {
        if (client.teamId) {
          const team = teams.find((t: any) => t.id === client.teamId);
          const teamName = team?.name || 'Unknown Team';
          
          if (!acc[client.teamId]) {
            acc[client.teamId] = {
              id: client.teamId,
              name: teamName,
              balance: 0,
              equity: 0,
              deposits: 0,
              withdrawals: 0,
              volume: 0,
              clientCount: 0,
            };
          }

          // Get ALL accounts for this client (not just the first one)
          const clientAccountsList = clientAccounts.filter(a => a.clientId === client.id);
          
          for (const clientAccount of clientAccountsList) {
            acc[client.teamId].balance += Number(clientAccount.balance);
            acc[client.teamId].equity += Number(clientAccount.equity);
            
            // Get subaccounts for this account
            const clientSubaccounts = subaccounts.filter(s => s.accountId === clientAccount.id);
            const clientSubaccountIds = new Set(clientSubaccounts.map(s => s.id));
            
            // Sum transactions for these subaccounts
            const clientTransactions = transactions.filter(t => clientSubaccountIds.has(t.subaccountId));
            
            acc[client.teamId].deposits += clientTransactions
              .filter(t => t.type === 'deposit')
              .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
            
            acc[client.teamId].withdrawals += clientTransactions
              .filter(t => t.type === 'withdrawal')
              .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
            
            acc[client.teamId].volume += clientTransactions
              .filter(t => t.type === 'trade')
              .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
          }

          acc[client.teamId].clientCount++;
        }
        return acc;
      }, {});

      // Breakdown by agent
      const byAgent = clients.reduce((acc: any, client: any) => {
        if (client.assignedAgentId) {
          const agent = users.find((u: any) => u.id === client.assignedAgentId);
          const agentName = agent?.name || 'Unknown Agent';
          
          if (!acc[client.assignedAgentId]) {
            acc[client.assignedAgentId] = {
              id: client.assignedAgentId,
              name: agentName,
              balance: 0,
              equity: 0,
              deposits: 0,
              withdrawals: 0,
              volume: 0,
              clientCount: 0,
            };
          }

          // Get ALL accounts for this client (not just the first one)
          const clientAccountsList = clientAccounts.filter(a => a.clientId === client.id);
          
          for (const clientAccount of clientAccountsList) {
            acc[client.assignedAgentId].balance += Number(clientAccount.balance);
            acc[client.assignedAgentId].equity += Number(clientAccount.equity);
            
            // Get subaccounts for this account
            const clientSubaccounts = subaccounts.filter(s => s.accountId === clientAccount.id);
            const clientSubaccountIds = new Set(clientSubaccounts.map(s => s.id));
            
            // Sum transactions for these subaccounts
            const clientTransactions = transactions.filter(t => clientSubaccountIds.has(t.subaccountId));
            
            acc[client.assignedAgentId].deposits += clientTransactions
              .filter(t => t.type === 'deposit')
              .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
            
            acc[client.assignedAgentId].withdrawals += clientTransactions
              .filter(t => t.type === 'withdrawal')
              .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
            
            acc[client.assignedAgentId].volume += clientTransactions
              .filter(t => t.type === 'trade')
              .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
          }

          acc[client.assignedAgentId].clientCount++;
        }
        return acc;
      }, {});

      res.json({
        totalBalance: Math.round(totalBalance * 100) / 100,
        totalEquity: Math.round(totalEquity * 100) / 100,
        totalDeposits: Math.round(deposits * 100) / 100,
        totalWithdrawals: Math.round(withdrawals * 100) / 100,
        tradingVolume: Math.round(tradingVolume * 100) / 100,
        netDeposits: Math.round((deposits - withdrawals) * 100) / 100,
        byTeam: Object.values(byTeam)
          .map((t: any) => ({
            ...t,
            balance: Math.round(t.balance * 100) / 100,
            equity: Math.round(t.equity * 100) / 100,
            deposits: Math.round(t.deposits * 100) / 100,
            withdrawals: Math.round(t.withdrawals * 100) / 100,
            volume: Math.round(t.volume * 100) / 100,
          }))
          .sort((a: any, b: any) => b.balance - a.balance),
        byAgent: Object.values(byAgent)
          .map((a: any) => ({
            ...a,
            balance: Math.round(a.balance * 100) / 100,
            equity: Math.round(a.equity * 100) / 100,
            deposits: Math.round(a.deposits * 100) / 100,
            withdrawals: Math.round(a.withdrawals * 100) / 100,
            volume: Math.round(a.volume * 100) / 100,
          }))
          .sort((a: any, b: any) => b.balance - a.balance),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/metrics/performance", authMiddleware, async (req: AuthRequest, res) => {
    try {
      // Block client-type users from accessing staff metrics
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff access required' });
      }

      // Get user's role for filtering
      const user = await storage.getUser(req.user!.id);
      let clients = await storage.getClients();
      
      // Apply role-based filtering
      if (user?.roleId) {
        const role = await storage.getRole(user.roleId);
        const roleName = role?.name?.toLowerCase();

        if (roleName === 'team leader') {
          clients = clients.filter(c => c.teamId === user.teamId);
        } else if (roleName === 'agent') {
          clients = clients.filter(c => c.assignedAgentId === user.id);
        }
      }

      const teams = await storage.getTeams();
      const users = await storage.getUsers();
      const allComments = await storage.getComments();
      const allAuditLogs = await storage.getAuditLogs();

      const clientIds = new Set(clients.map(c => c.id));
      const comments = allComments.filter(c => clientIds.has(c.clientId));
      
      // Filter audit logs for client status changes
      const statusChangeAudits = allAuditLogs.filter(
        log => log.targetType === 'client' && 
               log.action === 'client_edit' && 
               log.targetId &&
               clientIds.has(log.targetId) &&
               log.details && typeof log.details === 'object' &&
               'status' in log.details
      );

      // Calculate conversion rates
      const statusCounts = clients.reduce((acc: any, client: any) => {
        acc[client.status] = (acc[client.status] || 0) + 1;
        return acc;
      }, {});

      const totalClients = clients.length;
      const activeClients = clients.filter(c => 
        ['active', 'funded', 'converted'].includes(c.status)
      ).length;
      const leadClients = clients.filter(c => c.status === 'lead').length;
      
      const conversionRate = totalClients > 0 
        ? Math.round((activeClients / totalClients) * 100) 
        : 0;
      const leadConversionRate = leadClients > 0
        ? Math.round((activeClients / (leadClients + activeClients)) * 100)
        : 0;

      // Client acquisition trends (last 30 days, grouped by week)
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const newClients = clients.filter(c => {
        const createdAt = new Date(c.createdAt);
        return createdAt >= thirtyDaysAgo;
      });

      // Group by week
      const weeklyAcquisition: any = {};
      newClients.forEach(client => {
        const createdAt = new Date(client.createdAt);
        const weekStart = new Date(createdAt);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
        const weekKey = weekStart.toISOString().split('T')[0];
        
        weeklyAcquisition[weekKey] = (weeklyAcquisition[weekKey] || 0) + 1;
      });

      // Activity metrics
      const totalComments = comments.length;
      const avgCommentsPerClient = totalClients > 0 
        ? Math.round((totalComments / totalClients) * 10) / 10 
        : 0;
      const totalStatusChanges = statusChangeAudits.length;
      const avgStatusChangesPerClient = totalClients > 0
        ? Math.round((totalStatusChanges / totalClients) * 10) / 10
        : 0;

      // Most active agents by comments
      const commentsByAgent = comments.reduce((acc: any, comment: any) => {
        if (comment.userId) {
          const agent = users.find((u: any) => u.id === comment.userId);
          const agentName = agent?.name || 'Unknown Agent';
          
          if (!acc[comment.userId]) {
            acc[comment.userId] = {
              id: comment.userId,
              name: agentName,
              commentCount: 0,
            };
          }
          acc[comment.userId].commentCount++;
        }
        return acc;
      }, {});

      // Status change activity by agent
      const statusChangesByAgent = statusChangeAudits.reduce((acc: any, log: any) => {
        if (log.userId) {
          const agent = users.find((u: any) => u.id === log.userId);
          const agentName = agent?.name || 'Unknown Agent';
          
          if (!acc[log.userId]) {
            acc[log.userId] = {
              id: log.userId,
              name: agentName,
              statusChangeCount: 0,
            };
          }
          acc[log.userId].statusChangeCount++;
        }
        return acc;
      }, {});

      // Combine activity metrics per agent
      const agentActivity: any = {};
      [...Object.values(commentsByAgent), ...Object.values(statusChangesByAgent)].forEach((entry: any) => {
        if (!agentActivity[entry.id]) {
          agentActivity[entry.id] = {
            id: entry.id,
            name: entry.name,
            commentCount: 0,
            statusChangeCount: 0,
            totalActivity: 0,
          };
        }
        if (entry.commentCount) {
          agentActivity[entry.id].commentCount = entry.commentCount;
        }
        if (entry.statusChangeCount) {
          agentActivity[entry.id].statusChangeCount = entry.statusChangeCount;
        }
        agentActivity[entry.id].totalActivity = 
          agentActivity[entry.id].commentCount + agentActivity[entry.id].statusChangeCount;
      });

      // Response time metrics (time to first comment per client)
      const responseTimesMs: number[] = [];
      clients.forEach(client => {
        const clientComments = comments.filter(c => c.clientId === client.id);
        if (clientComments.length > 0) {
          // Sort by createdAt
          const sortedComments = clientComments.sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          const firstComment = sortedComments[0];
          const clientCreatedAt = new Date(client.createdAt).getTime();
          const firstCommentAt = new Date(firstComment.createdAt).getTime();
          responseTimesMs.push(firstCommentAt - clientCreatedAt);
        }
      });

      const avgResponseTimeHours = responseTimesMs.length > 0
        ? Math.round((responseTimesMs.reduce((sum, time) => sum + time, 0) / responseTimesMs.length) / (1000 * 60 * 60))
        : 0;

      // Breakdown by team
      const byTeam = clients.reduce((acc: any, client: any) => {
        if (client.teamId) {
          const team = teams.find((t: any) => t.id === client.teamId);
          const teamName = team?.name || 'Unknown Team';
          
          if (!acc[client.teamId]) {
            acc[client.teamId] = {
              id: client.teamId,
              name: teamName,
              clientCount: 0,
              activeClients: 0,
              conversionRate: 0,
              avgComments: 0,
              totalComments: 0,
            };
          }

          acc[client.teamId].clientCount++;
          if (['active', 'funded', 'converted'].includes(client.status)) {
            acc[client.teamId].activeClients++;
          }

          const teamComments = comments.filter(c => c.clientId === client.id);
          acc[client.teamId].totalComments += teamComments.length;
        }
        return acc;
      }, {});

      // Calculate team conversion rates and averages
      Object.values(byTeam).forEach((team: any) => {
        team.conversionRate = team.clientCount > 0
          ? Math.round((team.activeClients / team.clientCount) * 100)
          : 0;
        team.avgComments = team.clientCount > 0
          ? Math.round((team.totalComments / team.clientCount) * 10) / 10
          : 0;
      });

      res.json({
        // Conversion metrics
        conversionRate,
        leadConversionRate,
        activeClients,
        statusDistribution: statusCounts,
        
        // Acquisition metrics
        newClientsLast30Days: newClients.length,
        weeklyAcquisition: Object.entries(weeklyAcquisition)
          .map(([week, count]) => ({ week, count }))
          .sort((a, b) => a.week.localeCompare(b.week)),
        
        // Activity metrics
        totalComments,
        avgCommentsPerClient,
        totalStatusChanges,
        avgStatusChangesPerClient,
        avgResponseTimeHours,
        clientsWithComments: responseTimesMs.length,
        
        // Team performance
        byTeam: Object.values(byTeam).sort((a: any, b: any) => b.conversionRate - a.conversionRate),
        
        // Agent activity
        byAgent: Object.values(agentActivity)
          .sort((a: any, b: any) => b.totalActivity - a.totalActivity),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== API KEY MANAGEMENT =====
  app.post("/api/admin/api-keys", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { insertApiKeySchema } = await import("@shared/schema");
      const { generateApiKey } = await import("./utils/api-key");
      const { z } = await import("zod");

      // Create validation schema for user input (excludes server-set fields, accepts string dates)
      const apiKeyInputSchema = insertApiKeySchema
        .omit({
          createdBy: true,
          status: true,
        })
        .extend({
          expiresAt: z.union([z.string().datetime(), z.date()]).optional(),
          ipWhitelist: z.array(z.string()).optional(),
        });

      // Validate request body
      const validated = apiKeyInputSchema.parse(req.body);

      // Generate API key
      const { key, keyHash, keyPrefix } = generateApiKey();

      // Create API key record
      const apiKey = await storage.createApiKey({
        ...validated,
        ipWhitelist: validated.ipWhitelist || null,
        expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : null,
        createdBy: req.user!.id,
        status: 'active',
        keyHash,
        keyPrefix,
      });

      // Log audit
      await storage.createAuditLog({
        userId: req.user!.id,
        action: 'api_key_create',
        targetType: 'api_key',
        targetId: apiKey.id,
        details: { name: validated.name, scope: validated.scope },
      });

      // Return ONLY safe fields + the plaintext key (shown once)
      res.json({
        id: apiKey.id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        scope: apiKey.scope,
        ipWhitelist: apiKey.ipWhitelist,
        status: apiKey.status,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
        key, // The actual API key - show only once!
      });
    } catch (error: any) {
      // Handle validation errors with 400
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/api-keys", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const keys = await storage.getApiKeys(req.user!.id);
      
      // Remove sensitive data before sending
      const sanitizedKeys = keys.map(({ keyHash, ...key }) => key);
      
      res.json(sanitizedKeys);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/api-keys/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      // Get the key to ensure it exists and belongs to the user
      const existingKey = await storage.getApiKey(id);
      if (!existingKey) {
        return res.status(404).json({ error: "API key not found" });
      }

      if (existingKey.createdBy !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to revoke this key" });
      }

      // Revoke the key
      const revokedKey = await storage.revokeApiKey(id);

      // Log audit
      await storage.createAuditLog({
        userId: req.user!.id,
        action: 'api_key_revoke',
        targetType: 'api_key',
        targetId: id,
        details: { name: existingKey.name },
      });

      // Return ONLY safe fields (exclude keyHash)
      res.json({
        id: revokedKey.id,
        name: revokedKey.name,
        keyPrefix: revokedKey.keyPrefix,
        scope: revokedKey.scope,
        ipWhitelist: revokedKey.ipWhitelist,
        status: revokedKey.status,
        expiresAt: revokedKey.expiresAt,
        lastUsedAt: revokedKey.lastUsedAt,
        createdAt: revokedKey.createdAt,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== SSO IMPERSONATION ENDPOINTS =====
  app.post("/sso/impersonate", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const jwt = await import("jsonwebtoken");
      const crypto = await import("crypto");
      
      const { clientId, reason } = req.body;

      if (!clientId || !reason) {
        return res.status(400).json({ error: 'Missing required fields: clientId, reason' });
      }

      // Derive admin ID from authenticated session (not request body)
      const adminId = req.user!.id;

      // Verify the requesting user is an admin
      const admin = await storage.getUser(adminId);
      if (!admin || !admin.roleId) {
        return res.status(403).json({ error: 'Unauthorized: Admin access required' });
      }

      const role = await storage.getRole(admin.roleId);
      if (role?.name?.toLowerCase() !== 'administrator') {
        return res.status(403).json({ error: 'Unauthorized: Administrator role required' });
      }

      // Verify client exists
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      // Get or create SSO impersonation secret
      const ssoSecret = process.env.SSO_IMPERSONATION_SECRET || crypto.randomBytes(32).toString('hex');

      // Generate short-lived impersonation token (2 minutes)
      const impersonationToken = jwt.sign(
        {
          clientId,
          adminId,
          reason,
          email: client.email,
          type: 'impersonation',
        },
        ssoSecret,
        { expiresIn: '2m' }
      );

      // Log the impersonation
      await storage.createAuditLog({
        userId: adminId,
        action: 'sso_impersonate',
        targetType: 'client',
        targetId: clientId,
        details: { reason, impersonatedBy: admin.email },
      });

      res.json({ 
        success: true, 
        token: impersonationToken,
        expiresIn: 120 // seconds
      });
    } catch (error: any) {
      console.error('SSO impersonation error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/sso/consume", async (req, res) => {
    try {
      const jwt = await import("jsonwebtoken");
      const crypto = await import("crypto");
      
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid token' });
      }

      // Get SSO impersonation secret
      const ssoSecret = process.env.SSO_IMPERSONATION_SECRET || crypto.randomBytes(32).toString('hex');

      // Verify token
      const decoded = jwt.verify(token, ssoSecret) as any;

      if (decoded.type !== 'impersonation') {
        return res.status(400).json({ error: 'Invalid token type' });
      }

      // Get client
      const client = await storage.getClient(decoded.clientId);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      // Generate regular session token
      const sessionToken = generateToken({
        id: client.id,
        email: client.email,
        type: 'client'
      });

      // Log the successful impersonation
      await storage.createAuditLog({
        userId: decoded.adminId,
        action: 'sso_consume',
        targetType: 'client',
        targetId: decoded.clientId,
        details: { 
          reason: decoded.reason,
          consumedAt: new Date().toISOString()
        },
      });

      res.json({ 
        success: true, 
        token: sessionToken,
        client: { ...client, password: undefined }
      });
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Impersonation token expired' });
      }
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid impersonation token' });
      }
      console.error('SSO consume error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== WEBHOOK ENDPOINTS =====
  app.post("/api/webhooks/site", async (req, res) => {
    try {
      const { verifyWebhookSignature, getWebhookSecret } = await import("./utils/webhook");
      const crypto = await import("crypto");
      
      // Get webhook secret
      const webhookSecret = getWebhookSecret();
      
      // Get signature from header
      const signature = req.headers['x-signature'] as string;
      if (!signature) {
        return res.status(401).json({ error: 'Missing signature header' });
      }

      // Verify signature
      const payload = JSON.stringify(req.body);
      if (!verifyWebhookSignature(payload, signature, webhookSecret)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      // Process webhook event
      const { event, idempotencyKey, occurredAt, user, order, position, meta } = req.body;

      // Create audit log entry for webhook event
      await storage.createAuditLog({
        action: `webhook_${event}`,
        targetType: 'webhook',
        targetId: idempotencyKey || crypto.randomUUID(),
        details: {
          event,
          idempotencyKey,
          occurredAt,
          user,
          order,
          position,
          meta,
          source: meta?.source || 'trading-site',
        },
      });

      // Handle specific event types
      switch (event) {
        case 'user.created':
        case 'user.updated':
          // Could sync user data if needed
          break;

        case 'order.placed':
        case 'order.modified':
          // Could update order records
          break;

        case 'position.closed':
          // Could update position records
          break;

        case 'balance.updated':
        case 'deposit.requested':
        case 'withdrawal.requested':
          // Could update balance records
          break;

        default:
          console.log(`Unhandled webhook event: ${event}`);
      }

      res.json({ success: true, received: event });
    } catch (error: any) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== WEBSOCKET FOR MARKET DATA STREAMING =====
  const httpServer = createServer(app);
  
  // Referenced from blueprint:javascript_websocket
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/market-data' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected to market data stream');

    const subscriptions = new Map<string, (quote: any) => void>();

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.action === 'subscribe' && data.symbols) {
          const symbols = Array.isArray(data.symbols) ? data.symbols : [data.symbols];

          symbols.forEach((symbol: string) => {
            const callback = (quote: any) => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'quote', data: quote }));
              }
            };

            subscriptions.set(symbol, callback);
            twelveDataService.subscribe(symbol, callback);
          });
        }

        if (data.action === 'unsubscribe' && data.symbols) {
          const symbols = Array.isArray(data.symbols) ? data.symbols : [data.symbols];

          symbols.forEach((symbol: string) => {
            const callback = subscriptions.get(symbol);
            if (callback) {
              twelveDataService.unsubscribe(symbol, callback);
              subscriptions.delete(symbol);
            }
          });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      // Unsubscribe from all symbols
      subscriptions.forEach((callback, symbol) => {
        twelveDataService.unsubscribe(symbol, callback);
      });
      subscriptions.clear();
      console.log('Client disconnected from market data stream');
    });
  });

  // ===== SERVICE API (for Trading Platform) =====
  // Get client information by email
  app.get("/api/service/clients/:email", serviceTokenMiddleware, async (req, res) => {
    try {
      const { email } = req.params;
      
      const client = await storage.getClientByEmail(email);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      // Remove sensitive data
      const { password, ...clientData } = client;

      await storage.createAuditLog({
        action: 'service_api_access',
        targetType: 'client',
        targetId: client.id,
        details: { endpoint: 'get_client', source: 'trading_platform' },
      });

      res.json(clientData);
    } catch (error: any) {
      console.error('[Service API] Error getting client:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get account information by client email
  app.get("/api/service/accounts/:clientEmail", serviceTokenMiddleware, async (req, res) => {
    try {
      const { clientEmail } = req.params;
      
      const client = await storage.getClientByEmail(clientEmail);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      const accounts = await storage.getAccountsByClientId(client.id);
      if (accounts.length === 0) {
        return res.status(404).json({ error: 'No accounts found' });
      }

      const account = accounts[0];
      const subaccounts = await storage.getSubaccountsByAccountId(account.id);

      await storage.createAuditLog({
        action: 'service_api_access',
        targetType: 'account',
        targetId: account.id,
        details: { endpoint: 'get_account', source: 'trading_platform' },
      });

      res.json({ account, subaccounts });
    } catch (error: any) {
      console.error('[Service API] Error getting account:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update client KYC status
  app.patch("/api/service/clients/:email/kyc", serviceTokenMiddleware, async (req, res) => {
    try {
      const { email } = req.params;
      const { kycStatus, kycNotes } = req.body;
      
      const client = await storage.getClientByEmail(email);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      const oldKycStatus = client.kycStatus;
      await storage.updateClient(client.id, { 
        kycStatus: kycStatus as 'pending' | 'approved' | 'rejected',
        kycNotes: kycNotes,
      });

      await storage.createAuditLog({
        action: 'service_api_update',
        targetType: 'client',
        targetId: client.id,
        details: { 
          endpoint: 'update_kyc', 
          source: 'trading_platform',
          oldKycStatus,
          newKycStatus: kycStatus,
        },
      });

      res.json({ status: 'updated' });
    } catch (error: any) {
      console.error('[Service API] Error updating KYC:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Add client note/comment
  app.post("/api/service/clients/:email/notes", serviceTokenMiddleware, async (req, res) => {
    try {
      const { email } = req.params;
      const { content, type } = req.body;
      
      const client = await storage.getClientByEmail(email);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      const comment = await storage.createComment({
        clientId: client.id,
        content,
        type: type || 'note',
      });

      await storage.createAuditLog({
        action: 'service_api_create',
        targetType: 'comment',
        targetId: comment.id,
        details: { 
          endpoint: 'create_note', 
          source: 'trading_platform',
          clientId: client.id,
        },
      });

      res.json({ status: 'created', commentId: comment.id });
    } catch (error: any) {
      console.error('[Service API] Error creating note:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get client trading activity
  app.get("/api/service/clients/:email/activity", serviceTokenMiddleware, async (req, res) => {
    try {
      const { email } = req.params;
      
      const client = await storage.getClientByEmail(email);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      const accounts = await storage.getAccountsByClientId(client.id);
      if (accounts.length === 0) {
        return res.json({ positions: [], orders: [], comments: [] });
      }

      const account = accounts[0];
      const subaccounts = await storage.getSubaccountsByAccountId(account.id);
      
      const positions = [];
      const orders = [];

      for (const subaccount of subaccounts) {
        const subPositions = await storage.getPositionsBySubaccountId(subaccount.id);
        const subOrders = await storage.getOrdersBySubaccountId(subaccount.id);
        positions.push(...subPositions);
        orders.push(...subOrders);
      }

      const comments = await storage.getCommentsByClientId(client.id);

      await storage.createAuditLog({
        action: 'service_api_access',
        targetType: 'client',
        targetId: client.id,
        details: { endpoint: 'get_activity', source: 'trading_platform' },
      });

      res.json({ positions, orders, comments });
    } catch (error: any) {
      console.error('[Service API] Error getting activity:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate SSO impersonation token for client
  app.post("/api/clients/:id/impersonate", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const clientId = req.params.id;
      const requestingUser = req.user;

      // Check if user has permission (administrator only)
      if (requestingUser?.type !== 'user') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const user = await storage.getUserById(requestingUser.id);
      const role = user?.roleId ? await storage.getRoleById(user.roleId) : null;
      const isAdmin = role?.name.toLowerCase() === 'administrator';

      if (!isAdmin) {
        return res.status(403).json({ error: 'Only administrators can impersonate clients' });
      }

      // Get client
      const client = await storage.getClientById(clientId);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      // Generate SSO token (JWT with special type)
      const ssoToken = jwt.sign(
        {
          clientId: client.id,
          clientEmail: client.email,
          type: 'sso_impersonation',
          impersonatedBy: requestingUser.id,
          timestamp: Date.now(),
        },
        process.env.SSO_SECRET || 'sso-secret-change-in-production',
        { expiresIn: '15m' } // Short expiry for security
      );

      // Log impersonation in audit log
      await storage.createAuditLog({
        userId: requestingUser.id,
        action: 'client_impersonate',
        targetType: 'client',
        targetId: client.id,
        details: { 
          impersonatedBy: user?.name || requestingUser.email,
          clientEmail: client.email,
          clientName: `${client.firstName} ${client.lastName}`,
        },
      });

      // Return SSO URL (Trading Platform will validate this token)
      const tradingPlatformUrl = process.env.TRADING_PLATFORM_URL || 'https://trading-platform.example.com';
      const ssoUrl = `${tradingPlatformUrl}/sso/impersonate?token=${ssoToken}`;

      res.json({ 
        ssoToken, 
        ssoUrl,
        expiresIn: 900, // 15 minutes
      });
    } catch (error: any) {
      console.error('Impersonation error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Adjust account balance (Admin only)
  app.post("/api/accounts/:id/adjust-balance", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const accountId = req.params.id;
      const { amount, fundType, notes } = req.body;

      // Admin-only access check
      if (req.user?.type !== 'user') {
        await storage.createAuditLog({
          action: 'balance_adjust',
          targetType: 'account',
          targetId: accountId,
          details: { 
            error: 'Unauthorized: User access required',
            attemptedBy: req.user?.id,
            attemptedByType: req.user?.type
          },
        });
        return res.status(403).json({ error: 'Unauthorized: Admin access required' });
      }

      const user = await storage.getUser(req.user.id);
      const role = user?.roleId ? await storage.getRole(user.roleId) : null;
      
      if (role?.name?.toLowerCase() !== 'administrator') {
        await storage.createAuditLog({
          userId: req.user.id,
          action: 'balance_adjust',
          targetType: 'account',
          targetId: accountId,
          details: { 
            error: 'Unauthorized: Administrator role required',
            attemptedByRole: role?.name,
            attemptedByUser: user?.name
          },
        });
        return res.status(403).json({ error: 'Unauthorized: Administrator role required' });
      }

      // Validate input
      const schema = z.object({
        amount: z.string().refine((val) => !isNaN(parseFloat(val)), { message: 'Amount must be a valid number' }),
        fundType: z.enum(['real', 'demo', 'bonus']),
        notes: z.string().optional(),
      });

      const validation = schema.safeParse({ amount, fundType, notes });
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      // Get account
      const account = await storage.getAccount(accountId);
      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }

      // Calculate new balances
      const amountNum = parseFloat(amount);
      let newRealBalance = parseFloat(account.realBalance);
      let newDemoBalance = parseFloat(account.demoBalance);
      let newBonusBalance = parseFloat(account.bonusBalance);

      if (fundType === 'real') {
        newRealBalance += amountNum;
      } else if (fundType === 'demo') {
        newDemoBalance += amountNum;
      } else if (fundType === 'bonus') {
        newBonusBalance += amountNum;
      }

      // Calculate total balance
      const newTotalBalance = newRealBalance + newDemoBalance + newBonusBalance;

      // Update account
      const updatedAccount = await storage.updateAccount(accountId, {
        realBalance: newRealBalance.toString(),
        demoBalance: newDemoBalance.toString(),
        bonusBalance: newBonusBalance.toString(),
        balance: newTotalBalance.toString(),
      });

      // Create audit log
      await storage.createAuditLog({
        userId: req.user.id,
        action: 'balance_adjust',
        targetType: 'account',
        targetId: accountId,
        details: {
          amount: amountNum,
          fundType,
          reason: notes || '',
          oldRealBalance: account.realBalance,
          oldDemoBalance: account.demoBalance,
          oldBonusBalance: account.bonusBalance,
          oldTotalBalance: account.balance,
          newRealBalance: newRealBalance.toString(),
          newDemoBalance: newDemoBalance.toString(),
          newBonusBalance: newBonusBalance.toString(),
          newTotalBalance: newTotalBalance.toString(),
        },
      });

      res.json(updatedAccount);
    } catch (error: any) {
      console.error('Balance adjustment error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update account leverage (Admin only)
  app.patch("/api/accounts/:id/leverage", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const accountId = req.params.id;
      const { leverage } = req.body;

      // Admin-only access check
      if (req.user?.type !== 'user') {
        await storage.createAuditLog({
          action: 'balance_adjust',
          targetType: 'account',
          targetId: accountId,
          details: { 
            error: 'Unauthorized: User access required',
            attemptedBy: req.user?.id,
            attemptedByType: req.user?.type,
            action: 'leverage_update'
          },
        });
        return res.status(403).json({ error: 'Unauthorized: Admin access required' });
      }

      const user = await storage.getUser(req.user.id);
      const role = user?.roleId ? await storage.getRole(user.roleId) : null;
      
      if (role?.name?.toLowerCase() !== 'administrator') {
        await storage.createAuditLog({
          userId: req.user.id,
          action: 'balance_adjust',
          targetType: 'account',
          targetId: accountId,
          details: { 
            error: 'Unauthorized: Administrator role required',
            attemptedByRole: role?.name,
            attemptedByUser: user?.name,
            action: 'leverage_update'
          },
        });
        return res.status(403).json({ error: 'Unauthorized: Administrator role required' });
      }

      // Validate input
      const schema = z.object({
        leverage: z.number().min(1).max(500),
      });

      const validation = schema.safeParse({ leverage });
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      // Get account
      const account = await storage.getAccount(accountId);
      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }

      // Update leverage
      const updatedAccount = await storage.updateAccount(accountId, {
        leverage,
      });

      // Create audit log
      await storage.createAuditLog({
        userId: req.user.id,
        action: 'balance_adjust',
        targetType: 'account',
        targetId: accountId,
        details: {
          action: 'leverage_update',
          oldLeverage: account.leverage,
          newLeverage: leverage,
        },
      });

      res.json(updatedAccount);
    } catch (error: any) {
      console.error('Leverage update error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
