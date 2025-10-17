import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import express from "express";
import bcrypt from "bcrypt";
import multer from "multer";
import { z } from "zod";
import crypto from "crypto";
import { db } from "./db";
import { storage } from "./storage";
import { twelveDataService } from "./services/twelve-data";
import { tradingEngine } from "./services/trading-engine";
import { authMiddleware, optionalAuth, generateToken, verifyToken, serviceTokenMiddleware, type AuthRequest } from "./middleware/auth";
import * as performanceMetrics from "./services/performance-metrics";
import { previewImport, executeImport } from "./import";
import { 
  modifyPositionSchema, 
  markFTDSchema, 
  clients, 
  accounts, 
  symbolGroups, 
  tradingSymbols, 
  calendarEvents, 
  emailTemplates,
  chatRooms,
  chatMessages,
  clientComments,
  affiliates,
  affiliateReferrals,
  smtpSettings,
  paymentProviders,
  securitySettings,
  teamRoutingRules,
  insertTeamRoutingRuleSchema,
  teams,
  smartAssignmentSettings,
  insertSmartAssignmentSettingSchema,
  users
} from "@shared/schema";
import { eq, or, and, isNull, sql, desc } from "drizzle-orm";

// Helper to generate account number
function generateAccountNumber(): string {
  return 'ACC' + Date.now() + Math.floor(Math.random() * 1000);
}

// Helper functions for role checks
function isAgentRole(roleName: string | undefined): boolean {
  if (!roleName) return false;
  const normalized = roleName.toLowerCase();
  return normalized === 'agent' || normalized === 'sales agent' || normalized === 'retention agent';
}

function isTeamLeaderRole(roleName: string | undefined): boolean {
  if (!roleName) return false;
  const normalized = roleName.toLowerCase();
  return normalized === 'team leader' || normalized === 'sales team leader' || normalized === 'retention team leader';
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
          const { email, firstName, lastName, phone, dateOfBirth, country, registeredAt } = data;
          
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
            details: { event, source: 'trading_platform', email },
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
          
          // FUND TYPE MANAGEMENT: Deposits credit real funds (actual client money)
          const depositAmount = parseFloat(amount);
          const currentRealBalance = parseFloat(account.realBalance || '0');
          const currentDemoBalance = parseFloat(account.demoBalance || '0');
          const currentBonusBalance = parseFloat(account.bonusBalance || '0');
          
          // Credit to real balance (deposits are real money)
          const newRealBalance = (currentRealBalance + depositAmount).toString();
          const newTotalBalance = (
            parseFloat(newRealBalance) + 
            currentDemoBalance + 
            currentBonusBalance
          ).toString();

          // Update account with new balances
          await storage.updateAccount(account.id, {
            realBalance: newRealBalance,
            balance: newTotalBalance,
          });

          // Also update subaccount balance for backward compatibility
          const subaccounts = await storage.getSubaccountsByAccountId(account.id);
          const mainSubaccount = subaccounts.find(s => s.name === 'Main') || subaccounts[0];

          if (mainSubaccount) {
            const newSubBalance = (parseFloat(mainSubaccount.balance) + depositAmount).toString();
            await storage.updateSubaccount(mainSubaccount.id, { balance: newSubBalance });
          }

          await storage.createAuditLog({
            action: 'webhook_received',
            targetType: 'account',
            targetId: account.id,
            details: { 
              event, 
              source: 'trading_platform', 
              amount, 
              currency, 
              transactionId,
              fundType: 'real',
              oldRealBalance: account.realBalance,
              newRealBalance,
              oldTotalBalance: account.balance,
              newTotalBalance,
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
          
          // FUND TYPE VALIDATION: Withdrawals can only deduct from real funds
          const withdrawalAmount = parseFloat(amount);
          const currentRealBalance = parseFloat(account.realBalance || '0');
          
          if (currentRealBalance < withdrawalAmount) {
            console.error(`[Webhook] Insufficient real funds for withdrawal: ${clientEmail}, required: ${withdrawalAmount}, available: ${currentRealBalance}`);
            
            await storage.createAuditLog({
              action: 'webhook_received',
              targetType: 'account',
              targetId: account.id,
              details: { 
                event, 
                source: 'trading_platform', 
                amount, 
                currency, 
                transactionId,
                error: 'Insufficient real funds',
                requiredAmount: withdrawalAmount,
                availableRealBalance: currentRealBalance,
              },
            });
            
            return res.status(400).json({ 
              error: 'Insufficient real funds for withdrawal',
              required: withdrawalAmount,
              available: currentRealBalance
            });
          }

          // Deduct from real balance only
          const newRealBalance = (currentRealBalance - withdrawalAmount).toString();
          const newDemoBalance = account.demoBalance || '0';
          const newBonusBalance = account.bonusBalance || '0';
          const newTotalBalance = (
            parseFloat(newRealBalance) + 
            parseFloat(newDemoBalance) + 
            parseFloat(newBonusBalance)
          ).toString();

          // Update account with new balances
          await storage.updateAccount(account.id, {
            realBalance: newRealBalance,
            balance: newTotalBalance,
          });

          // Also update subaccount balance for backward compatibility
          const subaccounts = await storage.getSubaccountsByAccountId(account.id);
          const mainSubaccount = subaccounts.find(s => s.name === 'Main') || subaccounts[0];

          if (mainSubaccount) {
            const newSubBalance = (parseFloat(mainSubaccount.balance) - withdrawalAmount).toString();
            await storage.updateSubaccount(mainSubaccount.id, { balance: newSubBalance });
          }

          await storage.createAuditLog({
            action: 'webhook_received',
            targetType: 'account',
            targetId: account.id,
            details: { 
              event, 
              source: 'trading_platform', 
              amount, 
              currency, 
              transactionId,
              fundType: 'real',
              oldRealBalance: account.realBalance,
              newRealBalance,
              oldTotalBalance: account.balance,
              newTotalBalance,
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
        balance: '0',
        equity: '0',
        margin: '0',
        freeMargin: '0',
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
        else if (isTeamLeaderRole(roleName)) {
          clients = clients.filter(c => c.teamId === user.teamId);
        }
        // Agent sees only clients assigned to them
        else if (isAgentRole(roleName)) {
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

      // Get last comments for all clients in one query
      const clientIds = clients.map(c => c.id);
      const lastCommentsByClient = new Map();
      
      if (clientIds.length > 0) {
        const lastCommentsQuery = await db
          .select({
            clientId: clientComments.clientId,
            text: clientComments.text,
            createdAt: clientComments.createdAt,
          })
          .from(clientComments)
          .where(sql`${clientComments.clientId} = ANY(${clientIds})`)
          .orderBy(desc(clientComments.createdAt));

        // Group comments by client ID and get the most recent one
        for (const comment of lastCommentsQuery) {
          if (!lastCommentsByClient.has(comment.clientId)) {
            lastCommentsByClient.set(comment.clientId, {
              text: comment.text,
              date: comment.createdAt,
            });
          }
        }
      }

      // Enrich clients with agent, team, account, and comment information
      const enrichedClients = await Promise.all(clients.map(async (client) => {
        const assignedAgent = client.assignedAgentId ? await storage.getUser(client.assignedAgentId) : null;
        const team = client.teamId ? await storage.getTeam(client.teamId) : null;
        const account = await storage.getAccountByClientId(client.id);
        const lastComment = lastCommentsByClient.get(client.id);
        
        return {
          ...client,
          assignedAgent: assignedAgent ? { id: assignedAgent.id, name: assignedAgent.name } : null,
          team: team ? { id: team.id, name: team.name } : null,
          account: account || null,
          lastCommentDate: lastComment?.date || null,
          lastCommentPreview: lastComment?.text ? (lastComment.text.length > 50 ? lastComment.text.substring(0, 50) + '...' : lastComment.text) : null,
          registrationDate: client.createdAt,
        };
      }));

      res.json(enrichedClients);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Sales & Retention - Must come before /:id route
  app.get("/api/clients/sales", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type === 'client') {
        return res.status(403).json({ error: 'Unauthorized: Client access not allowed' });
      }

      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Get all clients and filter
      let allClients = await storage.getClients();
      let salesClients = allClients.filter(c => !c.hasFTD);
      
      // Apply role-based filtering
      if (user.roleId) {
        const role = await storage.getRole(user.roleId);
        const roleName = role?.name?.toLowerCase();

        if (isAgentRole(roleName)) {
          salesClients = salesClients.filter(c => c.assignedAgentId === user.id);
        } else if (isTeamLeaderRole(roleName) && user.teamId) {
          salesClients = salesClients.filter(c => c.teamId === user.teamId);
        }
      }

      // Get last comments for all clients in one query
      const clientIds = salesClients.map(c => c.id);
      const lastCommentsByClient = new Map();
      
      if (clientIds.length > 0) {
        const lastCommentsQuery = await db
          .select({
            clientId: clientComments.clientId,
            text: clientComments.text,
            createdAt: clientComments.createdAt,
          })
          .from(clientComments)
          .where(sql`${clientComments.clientId} = ANY(${clientIds})`)
          .orderBy(desc(clientComments.createdAt));

        // Group comments by client ID and get the most recent one
        for (const comment of lastCommentsQuery) {
          if (!lastCommentsByClient.has(comment.clientId)) {
            lastCommentsByClient.set(comment.clientId, {
              text: comment.text,
              date: comment.createdAt,
            });
          }
        }
      }

      // Enrich with agent, team, account, and comment info
      const enriched = await Promise.all(salesClients.map(async (client) => {
        const assignedAgent = client.assignedAgentId ? await storage.getUser(client.assignedAgentId) : null;
        const team = client.teamId ? await storage.getTeam(client.teamId) : null;
        const account = await storage.getAccountByClientId(client.id);
        const lastComment = lastCommentsByClient.get(client.id);
        
        return {
          ...client,
          name: `${client.firstName} ${client.lastName}`,
          assignedAgent: assignedAgent ? { id: assignedAgent.id, name: assignedAgent.name } : null,
          team: team ? { id: team.id, name: team.name } : null,
          account: account || null,
          lastCommentDate: lastComment?.date || null,
          lastCommentPreview: lastComment?.text ? (lastComment.text.length > 50 ? lastComment.text.substring(0, 50) + '...' : lastComment.text) : null,
          registrationDate: client.createdAt,
        };
      }));

      res.json(enriched);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/clients/retention", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type === 'client') {
        return res.status(403).json({ error: 'Unauthorized: Client access not allowed' });
      }

      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Get all clients and filter
      let allClients = await storage.getClients();
      let retentionClients = allClients.filter(c => c.hasFTD);
      
      // Apply role-based filtering
      if (user.roleId) {
        const role = await storage.getRole(user.roleId);
        const roleName = role?.name?.toLowerCase();

        if (isAgentRole(roleName)) {
          retentionClients = retentionClients.filter(c => c.assignedAgentId === user.id);
        } else if (isTeamLeaderRole(roleName) && user.teamId) {
          retentionClients = retentionClients.filter(c => c.teamId === user.teamId);
        }
      }

      // Get last comments for all clients in one query
      const clientIds = retentionClients.map(c => c.id);
      const lastCommentsByClient = new Map();
      
      if (clientIds.length > 0) {
        const lastCommentsQuery = await db
          .select({
            clientId: clientComments.clientId,
            text: clientComments.text,
            createdAt: clientComments.createdAt,
          })
          .from(clientComments)
          .where(sql`${clientComments.clientId} = ANY(${clientIds})`)
          .orderBy(desc(clientComments.createdAt));

        // Group comments by client ID and get the most recent one
        for (const comment of lastCommentsQuery) {
          if (!lastCommentsByClient.has(comment.clientId)) {
            lastCommentsByClient.set(comment.clientId, {
              text: comment.text,
              date: comment.createdAt,
            });
          }
        }
      }

      // Enrich with agent, team, account, and comment info
      const enriched = await Promise.all(retentionClients.map(async (client) => {
        const assignedAgent = client.assignedAgentId ? await storage.getUser(client.assignedAgentId) : null;
        const team = client.teamId ? await storage.getTeam(client.teamId) : null;
        const account = await storage.getAccountByClientId(client.id);
        const lastComment = lastCommentsByClient.get(client.id);
        
        return {
          ...client,
          name: `${client.firstName} ${client.lastName}`,
          assignedAgent: assignedAgent ? { id: assignedAgent.id, name: assignedAgent.name } : null,
          team: team ? { id: team.id, name: team.name } : null,
          account: account || null,
          lastCommentDate: lastComment?.date || null,
          lastCommentPreview: lastComment?.text ? (lastComment.text.length > 50 ? lastComment.text.substring(0, 50) + '...' : lastComment.text) : null,
          registrationDate: client.createdAt,
        };
      }));

      res.json(enriched);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/clients/:id/mark-ftd", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type === 'client') {
        return res.status(403).json({ error: 'Unauthorized: Client access not allowed' });
      }

      const { amount, fundType, notes } = req.body;
      
      if (!amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: "Valid amount is required" });
      }

      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      if (client.hasFTD) {
        return res.status(400).json({ error: "Client already has FTD marked" });
      }

      // Update client FTD status
      const updatedClient = await storage.updateClient(client.id, {
        hasFTD: true,
        ftdDate: new Date(),
        ftdAmount: amount,
        ftdFundType: fundType || 'real',
      });

      // Add funds to account
      const account = await storage.getAccountByClientId(client.id);
      if (account) {
        const fundAmount = parseFloat(amount);
        const updates: any = {};
        
        if (fundType === 'demo') {
          updates.demoBalance = (parseFloat(account.demoBalance) + fundAmount).toString();
        } else if (fundType === 'bonus') {
          updates.bonusBalance = (parseFloat(account.bonusBalance) + fundAmount).toString();
        } else {
          updates.realBalance = (parseFloat(account.realBalance) + fundAmount).toString();
        }

        await storage.updateAccount(account.id, updates);

        // Create transaction record
        await storage.createTransaction({
          accountId: account.id,
          type: 'deposit',
          amount: amount,
          fundType: fundType || 'real',
          notes: `FTD: First Time Deposit${notes ? ` - ${notes}` : ''}`,
        });
      }

      // Create audit log
      await storage.createAuditLog({
        userId: req.user?.id,
        action: 'client_ftd_marked',
        targetType: 'client',
        targetId: client.id,
        details: { amount, fundType, notes },
      });

      // Auto-transfer logic: Sales -> Retention based on language
      let transferResult = null;
      if (client.teamId) {
        const db = storage.db;
        const clientTeam = await db.select().from(teams).where(eq(teams.id, client.teamId)).limit(1);
        
        if (clientTeam.length > 0) {
          const team = clientTeam[0];
          
          // Check if this is a sales team with a language code
          if (team.department === 'sales' && team.languageCode) {
            // Find routing rule for this language
            const routingRules = await db.select()
              .from(teamRoutingRules)
              .where(and(
                eq(teamRoutingRules.languageCode, team.languageCode),
                eq(teamRoutingRules.isActive, true)
              ))
              .limit(1);
            
            if (routingRules.length > 0 && routingRules[0].retentionTeamId) {
              const routingRule = routingRules[0];
              
              // Transfer client to retention team
              await storage.updateClient(client.id, {
                teamId: routingRule.retentionTeamId,
              });

              // Log the transfer
              await storage.createAuditLog({
                userId: req.user?.id,
                action: 'client_transferred',
                targetType: 'client',
                targetId: client.id,
                details: { 
                  fromTeamId: team.id,
                  toTeamId: routingRule.retentionTeamId,
                  reason: 'FTD auto-transfer (Sales to Retention)',
                  languageCode: team.languageCode,
                },
              });

              transferResult = {
                transferred: true,
                fromTeam: team.name,
                toTeamId: routingRule.retentionTeamId,
                languageCode: team.languageCode,
              };
            }
          }
        }
      }

      res.json({ 
        ...updatedClient, 
        autoTransfer: transferResult 
      });
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
      const positions = await storage.getPositions({ accountId: account?.id, status: 'open' });
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

  app.get("/api/clients/:id/closed-positions", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      const account = await storage.getAccountByClientId(client.id);
      const closedPositions = await storage.getPositions({ accountId: account?.id, status: 'closed' });
      res.json(closedPositions);
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
        balance: '0',
        equity: '0',
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

      // FTD Automation: Check if status is changing to FTD
      if (updates.statusId) {
        const db = storage.db;
        const status = await db.select().from(customStatuses).where(eq(customStatuses.id, updates.statusId)).limit(1);
        
        if (status.length > 0 && status[0].name.toUpperCase() === 'FTD') {
          // Find retention team or CRM manager
          const retentionTeams = await db.select().from(teams).where(sql`LOWER(${teams.name}) LIKE '%retention%'`).limit(1);
          
          let assigned = false;
          
          if (retentionTeams.length > 0 && retentionTeams[0].leaderId) {
            // Assign to retention team leader
            const retentionTeam = retentionTeams[0];
            updates.teamId = retentionTeam.id;
            updates.assignedAgentId = retentionTeam.leaderId;
            assigned = true;
          }
          
          // Fallback: Find CRM Manager if retention team has no leader
          if (!assigned) {
            const crmManagerRoles = await db.select().from(roles).where(sql`LOWER(${roles.name}) LIKE '%crm%manager%'`).limit(1);
            
            if (crmManagerRoles.length > 0) {
              const crmManagers = await db.select().from(users).where(eq(users.roleId, crmManagerRoles[0].id)).limit(1);
              if (crmManagers.length > 0) {
                updates.assignedAgentId = crmManagers[0].id;
                updates.teamId = crmManagers[0].teamId;
              }
            }
          }
        }
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

  // ===== SALES & RETENTION ENDPOINTS =====
  app.get("/api/clients/sales", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ error: 'Unauthorized: No role assigned' });
      }

      const role = await storage.getRole(user.roleId);
      const permissions = (role?.permissions as string[]) || [];
      
      if (!permissions.includes('client.view_sales') && role?.name?.toLowerCase() !== 'administrator') {
        return res.status(403).json({ error: 'Unauthorized: Insufficient permissions' });
      }

      const db = storage.db;
      
      // Role-based filtering with FTD filter
      const roleName = role?.name?.toLowerCase();
      const ftdFilter = or(eq(clients.hasFTD, false), isNull(clients.hasFTD));
      
      let salesClients;
      if (isAgentRole(roleName) && user.teamId) {
        salesClients = await db.select().from(clients)
          .where(and(ftdFilter, eq(clients.teamId, user.teamId)));
      } else if (isTeamLeaderRole(roleName) && user.teamId) {
        salesClients = await db.select().from(clients)
          .where(and(ftdFilter, eq(clients.teamId, user.teamId)));
      } else {
        salesClients = await db.select().from(clients)
          .where(ftdFilter);
      }
      res.json(salesClients);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/clients/retention", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ error: 'Unauthorized: No role assigned' });
      }

      const role = await storage.getRole(user.roleId);
      const permissions = (role?.permissions as string[]) || [];
      
      if (!permissions.includes('client.view_retention') && role?.name?.toLowerCase() !== 'administrator') {
        return res.status(403).json({ error: 'Unauthorized: Insufficient permissions' });
      }

      const db = storage.db;
      
      // Role-based filtering with FTD filter
      const roleName = role?.name?.toLowerCase();
      const ftdFilter = eq(clients.hasFTD, true);
      
      let retentionClients;
      if (isAgentRole(roleName) && user.teamId) {
        retentionClients = await db.select().from(clients)
          .where(and(ftdFilter, eq(clients.teamId, user.teamId)));
      } else if (isTeamLeaderRole(roleName) && user.teamId) {
        retentionClients = await db.select().from(clients)
          .where(and(ftdFilter, eq(clients.teamId, user.teamId)));
      } else {
        retentionClients = await db.select().from(clients)
          .where(ftdFilter);
      }
      res.json(retentionClients);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/clients/:id/mark-ftd", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ error: 'Unauthorized: No role assigned' });
      }

      const role = await storage.getRole(user.roleId);
      const permissions = (role?.permissions as string[]) || [];
      
      if (!permissions.includes('client.mark_ftd') && role?.name?.toLowerCase() !== 'administrator') {
        return res.status(403).json({ error: 'Unauthorized: Insufficient permissions' });
      }

      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      if (client.hasFTD) {
        return res.status(400).json({ error: 'Client already marked as FTD' });
      }

      const validated = markFTDSchema.parse(req.body);
      const amount = parseFloat(validated.amount);

      // Get client's account
      const accounts = await storage.getAccountsByClientId(client.id);
      if (!accounts || accounts.length === 0) {
        return res.status(400).json({ error: 'Client has no account' });
      }

      const account = accounts[0];
      const db = storage.db;

      // Update client FTD status
      await db.update(clients)
        .set({
          hasFTD: true,
          ftdDate: new Date(),
          ftdAmount: amount.toString(),
          ftdFundType: validated.fundType,
        })
        .where(eq(clients.id, client.id));

      // Add funds to account based on fund type
      const balanceUpdate: any = {};
      if (validated.fundType === 'real') {
        balanceUpdate.realBalance = (parseFloat(account.realBalance) + amount).toString();
      } else if (validated.fundType === 'demo') {
        balanceUpdate.demoBalance = (parseFloat(account.demoBalance) + amount).toString();
      } else if (validated.fundType === 'bonus') {
        balanceUpdate.bonusBalance = (parseFloat(account.bonusBalance) + amount).toString();
      }

      balanceUpdate.balance = (
        parseFloat(balanceUpdate.realBalance || account.realBalance) +
        parseFloat(balanceUpdate.demoBalance || account.demoBalance) +
        parseFloat(balanceUpdate.bonusBalance || account.bonusBalance)
      ).toString();

      await db.update(accounts)
        .set(balanceUpdate)
        .where(eq(accounts.id, account.id));

      // Create transaction record
      await storage.createTransaction({
        accountId: account.id,
        type: 'deposit',
        fundType: validated.fundType,
        amount: amount.toString(),
        status: 'completed',
        notes: `FTD: ${validated.notes || 'First Time Deposit'}`,
      });

      // Create audit log
      await storage.createAuditLog({
        userId: user.id,
        action: 'client_ftd_marked',
        details: {
          clientId: client.id,
          amount: amount,
          fundType: validated.fundType,
          notes: validated.notes,
        },
      });

      res.json({ success: true, message: 'Client marked as FTD successfully' });
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
      // Debug: Log incoming order data
      console.log('[ORDER DEBUG] Received order request:', JSON.stringify(req.body, null, 2));
      
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
          } else if (isTeamLeaderRole(roleName)) {
            initiatorType = 'team_leader';
          } else if (isAgentRole(roleName)) {
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

      // Update P/L with current market prices for open positions
      const updatedPositions = await Promise.all(
        positions.map(async (position) => {
          if (position.status === 'open') {
            try {
              return await tradingEngine.updatePositionPnL(position);
            } catch (error) {
              console.error(`Failed to update P/L for position ${position.id}:`, error);
              return position; // Return original if update fails
            }
          }
          return position;
        })
      );

      res.json(updatedPositions);
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
      // Validate request body
      const validatedData = modifyPositionSchema.parse(req.body);

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

      // Capture before state for audit trail
      const beforeState = {
        openPrice: position.openPrice,
        closePrice: position.closePrice,
        quantity: position.quantity,
        side: position.side,
        status: position.status,
        unrealizedPnl: position.unrealizedPnl,
        realizedPnl: position.realizedPnl,
        fees: position.fees,
      };

      // Get account balance before modification
      const account = await storage.getAccount(position.accountId);
      const balanceBefore = account?.balance || '0';

      // Convert openedAt and closedAt strings to Date if provided
      const updates: any = { ...validatedData };
      if (updates.openedAt) {
        updates.openedAt = new Date(updates.openedAt);
      }
      if (updates.closedAt) {
        updates.closedAt = new Date(updates.closedAt);
      }

      const modifiedPosition = await tradingEngine.modifyPosition(req.params.id, updates);

      // Get account balance after modification
      const accountAfter = await storage.getAccount(position.accountId);
      const balanceAfter = accountAfter?.balance || '0';
      const balanceChange = parseFloat(balanceAfter) - parseFloat(balanceBefore);

      // Capture after state for audit trail
      const afterState = {
        openPrice: modifiedPosition.openPrice,
        closePrice: modifiedPosition.closePrice,
        quantity: modifiedPosition.quantity,
        side: modifiedPosition.side,
        status: modifiedPosition.status,
        unrealizedPnl: modifiedPosition.unrealizedPnl,
        realizedPnl: modifiedPosition.realizedPnl,
        fees: modifiedPosition.fees,
      };

      // Calculate P/L changes for audit trail
      const pnlChange = position.status === 'closed'
        ? parseFloat(modifiedPosition.realizedPnl || '0') - parseFloat(position.realizedPnl || '0')
        : parseFloat(modifiedPosition.unrealizedPnl || '0') - parseFloat(position.unrealizedPnl || '0');

      await storage.createAuditLog({
        userId: req.user?.type === 'user' ? req.user.id : undefined,
        clientId: req.user?.type === 'client' ? req.user.id : undefined,
        action: 'trade_edit',
        targetType: 'position',
        targetId: modifiedPosition.id,
        details: {
          before: beforeState,
          after: afterState,
          changes: validatedData,
          pnlChange: pnlChange.toFixed(2),
          balanceChange: balanceChange !== 0 ? balanceChange.toFixed(2) : undefined,
          balanceBefore: balanceBefore,
          balanceAfter: balanceAfter,
        },
      });

      res.json(modifiedPosition);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/positions/:id", authMiddleware, async (req: AuthRequest, res) => {
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
          return res.status(403).json({ error: "Unauthorized to delete this position" });
        }
      }

      // Delete the position
      await storage.deletePosition(req.params.id);

      await storage.createAuditLog({
        userId: req.user?.type === 'user' ? req.user.id : undefined,
        clientId: req.user?.type === 'client' ? req.user.id : undefined,
        action: 'trade_delete',
        targetType: 'position',
        targetId: req.params.id,
        details: { position },
      });

      res.json({ success: true, message: "Position deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== GLOBAL POSITIONS VIEW =====
  app.get("/api/positions/all/open", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ error: 'Unauthorized: No role assigned' });
      }

      const role = await storage.getRole(user.roleId);
      const permissions = (role?.permissions as string[]) || [];
      
      if (!permissions.includes('trade.view_all') && role?.name?.toLowerCase() !== 'administrator') {
        return res.status(403).json({ error: 'Unauthorized: Insufficient permissions' });
      }

      // Get all open positions
      const allPositions = await storage.getPositions({});
      const openPositions = allPositions.filter(p => p.status === 'open');

      // Enrich with client data
      const enrichedPositions = await Promise.all(openPositions.map(async (position) => {
        const account = await storage.getAccount(position.accountId);
        const client = account ? await storage.getClient(account.clientId) : null;
        return {
          ...position,
          clientName: client?.name || 'Unknown',
          clientEmail: client?.email || '',
          accountNumber: account?.accountNumber || '',
        };
      }));

      // Role-based filtering
      const roleName = role?.name?.toLowerCase();
      if (isAgentRole(roleName) && user.teamId) {
        const filteredPositions = await Promise.all(
          enrichedPositions.filter(async (p) => {
            const account = await storage.getAccount(p.accountId);
            const client = account ? await storage.getClient(account.clientId) : null;
            return client?.teamId === user.teamId;
          })
        );
        return res.json(filteredPositions);
      } else if (isTeamLeaderRole(roleName) && user.teamId) {
        const filteredPositions = await Promise.all(
          enrichedPositions.filter(async (p) => {
            const account = await storage.getAccount(p.accountId);
            const client = account ? await storage.getClient(account.clientId) : null;
            return client?.teamId === user.teamId;
          })
        );
        return res.json(filteredPositions);
      }

      res.json(enrichedPositions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/positions/all/closed", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ error: 'Unauthorized: No role assigned' });
      }

      const role = await storage.getRole(user.roleId);
      const permissions = (role?.permissions as string[]) || [];
      
      if (!permissions.includes('trade.view_all') && role?.name?.toLowerCase() !== 'administrator') {
        return res.status(403).json({ error: 'Unauthorized: Insufficient permissions' });
      }

      // Get all closed positions
      const allPositions = await storage.getPositions({});
      const closedPositions = allPositions.filter(p => p.status === 'closed');

      // Enrich with client data
      const enrichedPositions = await Promise.all(closedPositions.map(async (position) => {
        const account = await storage.getAccount(position.accountId);
        const client = account ? await storage.getClient(account.clientId) : null;
        return {
          ...position,
          clientName: client?.name || 'Unknown',
          clientEmail: client?.email || '',
          accountNumber: account?.accountNumber || '',
        };
      }));

      // Role-based filtering
      const roleName = role?.name?.toLowerCase();
      if (isAgentRole(roleName) && user.teamId) {
        const filteredPositions = await Promise.all(
          enrichedPositions.filter(async (p) => {
            const account = await storage.getAccount(p.accountId);
            const client = account ? await storage.getClient(account.clientId) : null;
            return client?.teamId === user.teamId;
          })
        );
        return res.json(filteredPositions);
      } else if (isTeamLeaderRole(roleName) && user.teamId) {
        const filteredPositions = await Promise.all(
          enrichedPositions.filter(async (p) => {
            const account = await storage.getAccount(p.accountId);
            const client = account ? await storage.getClient(account.clientId) : null;
            return client?.teamId === user.teamId;
          })
        );
        return res.json(filteredPositions);
      }

      res.json(enrichedPositions);
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

  // ===== TRADING SYMBOLS (100,000+ from Twelve Data) =====
  app.get("/api/symbols/forex", async (req, res) => {
    try {
      const symbols = await twelveDataService.getForexPairs();
      res.json(symbols);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/symbols/crypto", async (req, res) => {
    try {
      const symbols = await twelveDataService.getCryptocurrencies();
      res.json(symbols);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/symbols/commodities", async (req, res) => {
    try {
      const symbols = await twelveDataService.getCommodities();
      res.json(symbols);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/symbols/stocks", async (req, res) => {
    try {
      const { exchange = 'NYSE' } = req.query;
      const symbols = await twelveDataService.getStocks(exchange as string);
      res.json(symbols);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/symbols/etf", async (req, res) => {
    try {
      const { exchange = 'NYSE' } = req.query;
      const symbols = await twelveDataService.getETFs(exchange as string);
      res.json(symbols);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/symbols/all", async (req, res) => {
    try {
      const options = {
        includeForex: req.query.includeForex !== 'false',
        includeCrypto: req.query.includeCrypto !== 'false',
        includeCommodities: req.query.includeCommodities !== 'false',
        stockExchanges: req.query.stockExchanges ? (req.query.stockExchanges as string).split(',') : [],
        etfExchanges: req.query.etfExchanges ? (req.query.etfExchanges as string).split(',') : [],
      };
      const symbols = await twelveDataService.getAllSymbols(options);
      res.json(symbols);
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

  // ===== PERFORMANCE DASHBOARD APIs =====
  
  // Get current user's performance metrics
  app.get("/api/dashboard/my-performance", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff access required' });
      }

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const metrics = await performanceMetrics.calculateAgentMetrics(req.user.id, startDate, endDate);
      
      if (!metrics) {
        return res.status(404).json({ error: 'Metrics not found' });
      }

      res.json(metrics);
    } catch (error: any) {
      console.error('Error fetching my performance:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get specific agent's performance metrics (for managers/team leaders)
  app.get("/api/dashboard/agent/:agentId", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff access required' });
      }

      const { agentId } = req.params;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      // TODO: Add permission check - only allow if user is manager/team leader/admin
      
      const metrics = await performanceMetrics.calculateAgentMetrics(agentId, startDate, endDate);
      
      if (!metrics) {
        return res.status(404).json({ error: 'Agent metrics not found' });
      }

      res.json(metrics);
    } catch (error: any) {
      console.error('Error fetching agent performance:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get team performance metrics
  app.get("/api/dashboard/team/:teamId", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff access required' });
      }

      const { teamId } = req.params;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      // TODO: Add permission check - only allow if user is team leader of this team or manager/admin
      
      const metrics = await performanceMetrics.calculateTeamMetrics(teamId, startDate, endDate);
      
      if (!metrics) {
        return res.status(404).json({ error: 'Team metrics not found' });
      }

      res.json(metrics);
    } catch (error: any) {
      console.error('Error fetching team performance:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get department performance metrics
  app.get("/api/dashboard/department/:department", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff access required' });
      }

      const { department } = req.params;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      if (!['sales', 'retention', 'support'].includes(department)) {
        return res.status(400).json({ error: 'Invalid department' });
      }

      // TODO: Add permission check - only allow if user is manager of this department or admin
      
      const metrics = await performanceMetrics.calculateDepartmentMetrics(
        department as 'sales' | 'retention' | 'support',
        startDate,
        endDate
      );

      res.json(metrics);
    } catch (error: any) {
      console.error('Error fetching department performance:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get language performance metrics
  app.get("/api/dashboard/language/:languageCode", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff access required' });
      }

      const { languageCode } = req.params;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      // TODO: Add permission check - only allow managers/admin
      
      const metrics = await performanceMetrics.calculateLanguageMetrics(languageCode, startDate, endDate);

      res.json(metrics);
    } catch (error: any) {
      console.error('Error fetching language performance:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get top performing agents
  app.get("/api/dashboard/top-performers", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff access required' });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const topPerformers = await performanceMetrics.getTopPerformingAgents(limit, startDate, endDate);

      res.json(topPerformers);
    } catch (error: any) {
      console.error('Error fetching top performers:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get global platform-wide metrics
  app.get("/api/dashboard/global", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff access required' });
      }

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      // TODO: Add permission check - only allow managers/admin

      const metrics = await performanceMetrics.calculateGlobalMetrics(startDate, endDate);

      res.json(metrics);
    } catch (error: any) {
      console.error('Error fetching global metrics:', error);
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

        if (isTeamLeaderRole(roleName)) {
          clients = clients.filter(c => c.teamId === user.teamId);
        } else if (isAgentRole(roleName)) {
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

        if (isTeamLeaderRole(roleName)) {
          clients = clients.filter(c => c.teamId === user.teamId);
        } else if (isAgentRole(roleName)) {
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

        if (isTeamLeaderRole(roleName)) {
          clients = clients.filter(c => c.teamId === user.teamId);
        } else if (isAgentRole(roleName)) {
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

  // ===== CFD ACCOUNTS MONITORING =====
  app.get("/api/accounts/all", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ error: 'Unauthorized: No role assigned' });
      }

      const role = await storage.getRole(user.roleId);
      const roleName = role?.name?.toLowerCase();

      // Get all accounts
      let accounts = await storage.getAccounts();
      
      // Role-based filtering
      if (isAgentRole(roleName) && user.teamId) {
        const teamClients = (await storage.getClients()).filter(c => c.teamId === user.teamId);
        const teamClientIds = new Set(teamClients.map(c => c.id));
        accounts = accounts.filter(a => teamClientIds.has(a.clientId));
      } else if (isTeamLeaderRole(roleName) && user.teamId) {
        const teamClients = (await storage.getClients()).filter(c => c.teamId === user.teamId);
        const teamClientIds = new Set(teamClients.map(c => c.id));
        accounts = accounts.filter(a => teamClientIds.has(a.clientId));
      }

      // Enrich with client data
      const enrichedAccounts = await Promise.all(
        accounts.map(async (account) => {
          const client = await storage.getClient(account.clientId);
          return {
            ...account,
            client: client ? {
              id: client.id,
              firstName: client.firstName,
              lastName: client.lastName,
              email: client.email,
              country: client.country,
              status: client.status,
              hasFTD: client.hasFTD,
            } : null,
          };
        })
      );

      res.json(enrichedAccounts.filter(a => a.client !== null));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== SYMBOL GROUPS MANAGEMENT =====
  app.get("/api/symbol-groups", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const db = storage.db;
      const groups = await db.select().from(symbolGroups);
      res.json(groups);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/symbol-groups", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ error: 'Unauthorized: No role assigned' });
      }

      const role = await storage.getRole(user.roleId);
      const permissions = (role?.permissions as string[]) || [];
      
      if (!permissions.includes('symbol.manage') && role?.name?.toLowerCase() !== 'administrator') {
        return res.status(403).json({ error: 'Unauthorized: Insufficient permissions' });
      }

      const db = storage.db;
      const [newGroup] = await db.insert(symbolGroups).values({
        name: req.body.name,
        displayName: req.body.displayName || req.body.name,
        description: req.body.description,
        defaultSpread: req.body.defaultSpread,
        defaultLeverage: req.body.defaultLeverage || 100,
        sortOrder: req.body.sortOrder || 0,
        isActive: req.body.isActive ?? true,
      }).returning();

      await storage.createAuditLog({
        userId: user.id,
        action: 'symbol_group_create',
        details: { symbolGroup: newGroup },
      });

      res.json(newGroup);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/symbol-groups/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ error: 'Unauthorized: No role assigned' });
      }

      const role = await storage.getRole(user.roleId);
      const permissions = (role?.permissions as string[]) || [];
      
      if (!permissions.includes('symbol.manage') && role?.name?.toLowerCase() !== 'administrator') {
        return res.status(403).json({ error: 'Unauthorized: Insufficient permissions' });
      }

      const db = storage.db;
      const [updatedGroup] = await db.update(symbolGroups)
        .set({
          ...req.body,
          updatedAt: new Date(),
        })
        .where(eq(symbolGroups.id, req.params.id))
        .returning();

      await storage.createAuditLog({
        userId: user.id,
        action: 'symbol_group_edit',
        details: { symbolGroupId: req.params.id, changes: req.body },
      });

      res.json(updatedGroup);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/symbol-groups/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ error: 'Unauthorized: No role assigned' });
      }

      const role = await storage.getRole(user.roleId);
      const permissions = (role?.permissions as string[]) || [];
      
      if (!permissions.includes('symbol.manage') && role?.name?.toLowerCase() !== 'administrator') {
        return res.status(403).json({ error: 'Unauthorized: Insufficient permissions' });
      }

      const db = storage.db;
      await db.delete(symbolGroups).where(eq(symbolGroups.id, req.params.id));

      await storage.createAuditLog({
        userId: user.id,
        action: 'symbol_group_delete',
        details: { symbolGroupId: req.params.id },
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== TRADING SYMBOLS MANAGEMENT =====
  app.get("/api/symbols", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const db = storage.db;
      const symbols = await db.select().from(tradingSymbols);
      res.json(symbols);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/symbols", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ error: 'Unauthorized: No role assigned' });
      }

      const role = await storage.getRole(user.roleId);
      const permissions = (role?.permissions as string[]) || [];
      
      if (!permissions.includes('symbol.manage') && role?.name?.toLowerCase() !== 'administrator') {
        return res.status(403).json({ error: 'Unauthorized: Insufficient permissions' });
      }

      const db = storage.db;
      const [newSymbol] = await db.insert(tradingSymbols).values({
        symbol: req.body.symbol,
        displayName: req.body.displayName || req.body.symbol,
        category: req.body.category || 'forex',
        groupId: req.body.groupId,
        baseAsset: req.body.baseAsset,
        quoteAsset: req.body.quoteAsset,
        twelveDataSymbol: req.body.twelveDataSymbol || req.body.symbol,
        contractSize: req.body.contractSize || '100000',
        minLotSize: req.body.minLotSize || '0.01',
        maxLotSize: req.body.maxLotSize || '100',
        spreadDefault: req.body.spreadDefault || '0',
        commissionRate: req.body.commissionRate || '0',
        leverage: req.body.leverage || 100,
        tradingHours: req.body.tradingHours || [],
        digits: req.body.digits || 5,
        isActive: req.body.isActive ?? true,
      }).returning();

      await storage.createAuditLog({
        userId: user.id,
        action: 'symbol_create',
        details: { symbol: newSymbol },
      });

      res.json(newSymbol);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/symbols/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ error: 'Unauthorized: No role assigned' });
      }

      const role = await storage.getRole(user.roleId);
      const permissions = (role?.permissions as string[]) || [];
      
      if (!permissions.includes('symbol.manage') && role?.name?.toLowerCase() !== 'administrator') {
        return res.status(403).json({ error: 'Unauthorized: Insufficient permissions' });
      }

      const db = storage.db;
      const [updatedSymbol] = await db.update(tradingSymbols)
        .set({
          ...req.body,
          updatedAt: new Date(),
        })
        .where(eq(tradingSymbols.id, req.params.id))
        .returning();

      await storage.createAuditLog({
        userId: user.id,
        action: 'symbol_edit',
        details: { symbolId: req.params.id, changes: req.body },
      });

      res.json(updatedSymbol);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/symbols/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ error: 'Unauthorized: No role assigned' });
      }

      const role = await storage.getRole(user.roleId);
      const permissions = (role?.permissions as string[]) || [];
      
      if (!permissions.includes('symbol.manage') && role?.name?.toLowerCase() !== 'administrator') {
        return res.status(403).json({ error: 'Unauthorized: Insufficient permissions' });
      }

      const db = storage.db;
      await db.delete(tradingSymbols).where(eq(tradingSymbols.id, req.params.id));

      await storage.createAuditLog({
        userId: user.id,
        action: 'symbol_delete',
        details: { symbolId: req.params.id },
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== CALENDAR EVENTS =====
  app.get("/api/calendar/events", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ error: 'Unauthorized: No role assigned' });
      }

      const role = await storage.getRole(user.roleId);
      const permissions = (role?.permissions as string[]) || [];
      
      if (!permissions.includes('calendar.view') && role?.name?.toLowerCase() !== 'administrator') {
        return res.status(403).json({ error: 'Unauthorized: Insufficient permissions' });
      }

      let query = db.select().from(calendarEvents);

      // Role-based filtering
      const roleName = role?.name?.toLowerCase();
      if (roleName === 'agent') {
        query = query.where(eq(calendarEvents.userId, user.id));
      } else if (isTeamLeaderRole(roleName) && user.teamId) {
        // Team leaders see their own events and their team's events
        const teamUsers = await db.select().from(users).where(eq(users.teamId, user.teamId));
        const userIds = teamUsers.map(u => u.id);
        query = query.where(or(...userIds.map(id => eq(calendarEvents.userId, id))));
      }

      const events = await query;
      res.json(events);
    } catch (error: any) {
      console.error('[Calendar Events GET Error]:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/calendar/events", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ error: 'Unauthorized: No role assigned' });
      }

      const role = await storage.getRole(user.roleId);
      const permissions = (role?.permissions as string[]) || [];
      
      if (!permissions.includes('calendar.manage') && role?.name?.toLowerCase() !== 'administrator') {
        return res.status(403).json({ error: 'Unauthorized: Insufficient permissions' });
      }

      const [newEvent] = await db.insert(calendarEvents).values({
        title: req.body.title,
        description: req.body.description,
        startTime: new Date(req.body.startTime),
        endTime: new Date(req.body.endTime),
        userId: req.body.userId || user.id,
        clientId: req.body.clientId || null,
        eventType: req.body.eventType,
      }).returning();

      await storage.createAuditLog({
        userId: user.id,
        action: 'calendar_event_create',
        details: { event: newEvent },
      });

      res.json(newEvent);
    } catch (error: any) {
      console.error('[Calendar Events POST Error]:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/calendar/events/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ error: 'Unauthorized: No role assigned' });
      }

      const role = await storage.getRole(user.roleId);
      const permissions = (role?.permissions as string[]) || [];
      
      if (!permissions.includes('calendar.manage') && role?.name?.toLowerCase() !== 'administrator') {
        return res.status(403).json({ error: 'Unauthorized: Insufficient permissions' });
      }

      const updateData: any = { ...req.body, updatedAt: new Date() };
      if (req.body.startTime) updateData.startTime = new Date(req.body.startTime);
      if (req.body.endTime) updateData.endTime = new Date(req.body.endTime);

      const [updatedEvent] = await db.update(calendarEvents)
        .set(updateData)
        .where(eq(calendarEvents.id, req.params.id))
        .returning();

      await storage.createAuditLog({
        userId: user.id,
        action: 'calendar_event_edit',
        details: { eventId: req.params.id, changes: req.body },
      });

      res.json(updatedEvent);
    } catch (error: any) {
      console.error('[Calendar Events PATCH Error]:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/calendar/events/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ error: 'Unauthorized: No role assigned' });
      }

      const role = await storage.getRole(user.roleId);
      const permissions = (role?.permissions as string[]) || [];
      
      if (!permissions.includes('calendar.manage') && role?.name?.toLowerCase() !== 'administrator') {
        return res.status(403).json({ error: 'Unauthorized: Insufficient permissions' });
      }

      await db.delete(calendarEvents).where(eq(calendarEvents.id, req.params.id));

      await storage.createAuditLog({
        userId: user.id,
        action: 'calendar_event_delete',
        details: { eventId: req.params.id },
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error('[Calendar Events DELETE Error]:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== EMAIL TEMPLATES =====
  app.get("/api/email-templates", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ error: 'Unauthorized: No role assigned' });
      }

      const role = await storage.getRole(user.roleId);
      const permissions = (role?.permissions as string[]) || [];
      
      if (!permissions.includes('email_template.view') && role?.name?.toLowerCase() !== 'administrator') {
        return res.status(403).json({ error: 'Unauthorized: Insufficient permissions' });
      }

      const db = storage.db;
      const templates = await db.select().from(emailTemplates);
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/email-templates", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ error: 'Unauthorized: No role assigned' });
      }

      const role = await storage.getRole(user.roleId);
      const permissions = (role?.permissions as string[]) || [];
      
      if (!permissions.includes('email_template.manage') && role?.name?.toLowerCase() !== 'administrator') {
        return res.status(403).json({ error: 'Unauthorized: Insufficient permissions' });
      }

      const db = storage.db;
      const [newTemplate] = await db.insert(emailTemplates).values({
        name: req.body.name,
        subject: req.body.subject,
        body: req.body.body,
        variables: req.body.variables || [],
      }).returning();

      await storage.createAuditLog({
        userId: user.id,
        action: 'email_template_create',
        details: { template: newTemplate },
      });

      res.json(newTemplate);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/email-templates/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ error: 'Unauthorized: No role assigned' });
      }

      const role = await storage.getRole(user.roleId);
      const permissions = (role?.permissions as string[]) || [];
      
      if (!permissions.includes('email_template.manage') && role?.name?.toLowerCase() !== 'administrator') {
        return res.status(403).json({ error: 'Unauthorized: Insufficient permissions' });
      }

      const db = storage.db;
      const [updatedTemplate] = await db.update(emailTemplates)
        .set({
          name: req.body.name,
          subject: req.body.subject,
          body: req.body.body,
          variables: req.body.variables,
          updatedAt: new Date(),
        })
        .where(eq(emailTemplates.id, req.params.id))
        .returning();

      await storage.createAuditLog({
        userId: user.id,
        action: 'email_template_edit',
        details: { templateId: req.params.id, changes: req.body },
      });

      res.json(updatedTemplate);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/email-templates/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ error: 'Unauthorized: No role assigned' });
      }

      const role = await storage.getRole(user.roleId);
      const permissions = (role?.permissions as string[]) || [];
      
      if (!permissions.includes('email_template.manage') && role?.name?.toLowerCase() !== 'administrator') {
        return res.status(403).json({ error: 'Unauthorized: Insufficient permissions' });
      }

      const db = storage.db;
      await db.delete(emailTemplates).where(eq(emailTemplates.id, req.params.id));

      await storage.createAuditLog({
        userId: user.id,
        action: 'email_template_delete',
        details: { templateId: req.params.id },
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== CHAT ROOMS & MESSAGES =====
  app.get("/api/chat/rooms", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const roomsData = await db
        .select({
          id: chatRooms.id,
          type: chatRooms.type,
          clientId: chatRooms.clientId,
          participantId: chatRooms.participantId,
          name: chatRooms.name,
          createdAt: chatRooms.createdAt,
          client: {
            id: clients.id,
            firstName: clients.firstName,
            lastName: clients.lastName,
          },
          participant: {
            id: users.id,
            name: users.name,
          },
        })
        .from(chatRooms)
        .leftJoin(clients, eq(chatRooms.clientId, clients.id))
        .leftJoin(users, eq(chatRooms.participantId, users.id));

      const rooms = roomsData.map((r: any) => ({
        ...r,
        client: r.client.id ? r.client : null,
        participant: r.participant.id ? r.participant : null,
      }));

      res.json(rooms);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/chat/rooms", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const [newRoom] = await db.insert(chatRooms).values({
        type: req.body.type,
        clientId: req.body.clientId || null,
        participantId: req.body.participantId || null,
        name: req.body.name || null,
      }).returning();

      res.json(newRoom);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/chat/rooms/:id/messages", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const messages = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.roomId, req.params.id))
        .orderBy(chatMessages.createdAt);
      
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/chat/rooms/:id/messages", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const user = await storage.getUser(req.user.id);
      
      const [newMessage] = await db.insert(chatMessages).values({
        roomId: req.params.id,
        senderId: user?.id || req.user.id,
        senderType: 'user',
        message: req.body.message,
        attachments: req.body.attachments || [],
      }).returning();

      // Update room's last message timestamp
      await db.update(chatRooms)
        .set({ lastMessageAt: new Date() })
        .where(eq(chatRooms.id, req.params.id));

      res.json(newMessage);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/chat/messages/:id/read", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const [updated] = await db.update(chatMessages)
        .set({ isRead: true })
        .where(eq(chatMessages.id, req.params.id))
        .returning();

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== SALES DASHBOARD =====
  app.get("/api/reports/sales-dashboard", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ error: 'Unauthorized: No role assigned' });
      }

      const role = await storage.getRole(user.roleId);
      const permissions = (role?.permissions as string[]) || [];
      const roleName = role?.name?.toLowerCase();

      // Parse query parameters for filtering
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      const teamFilter = req.query.teamId as string | undefined;
      const agentFilter = req.query.agentId as string | undefined;

      // Get all clients based on role
      let allClients = await storage.getClients();
      
      if (isAgentRole(roleName) && user.teamId) {
        allClients = allClients.filter(c => c.teamId === user.teamId);
      } else if (isTeamLeaderRole(roleName) && user.teamId) {
        allClients = allClients.filter(c => c.teamId === user.teamId);
      }

      // Apply filters
      if (teamFilter) {
        allClients = allClients.filter(c => c.teamId === teamFilter);
      }
      if (agentFilter) {
        allClients = allClients.filter(c => c.assignedTo === agentFilter);
      }

      // Calculate metrics
      const totalClients = allClients.length;
      const salesClients = allClients.filter(c => !c.hasFTD).length;
      const retentionClients = allClients.filter(c => c.hasFTD).length;
      
      // FTD metrics
      const ftdClients = allClients.filter(c => c.hasFTD);
      const totalFTDAmount = ftdClients.reduce((sum, c) => sum + (parseFloat(c.ftdAmount || '0')), 0);
      const avgFTDAmount = ftdClients.length > 0 ? totalFTDAmount / ftdClients.length : 0;

      // Recent FTDs (within date range)
      const recentFTDs = ftdClients.filter(c => {
        if (!c.ftdDate) return false;
        const ftdDate = new Date(c.ftdDate);
        return ftdDate >= startDate && ftdDate <= endDate;
      });

      // Pipeline status distribution (conversion funnel)
      const pipelineDistribution = allClients.reduce((acc: any, client) => {
        const status = client.pipelineStatus || 'new_lead';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      // Time series data (daily FTD counts)
      const timeSeries: any[] = [];
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      for (let i = 0; i <= daysDiff; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayFTDs = ftdClients.filter(c => {
          if (!c.ftdDate) return false;
          return c.ftdDate.split('T')[0] === dateStr;
        });

        timeSeries.push({
          date: dateStr,
          ftdCount: dayFTDs.length,
          ftdAmount: dayFTDs.reduce((sum, c) => sum + parseFloat(c.ftdAmount || '0'), 0),
          newClients: allClients.filter(c => c.createdAt?.split('T')[0] === dateStr).length,
        });
      }

      // Agent performance
      const users = await storage.getUsers();
      const agentPerformance = users
        .filter(u => u.type === 'user')
        .map(agent => {
          const agentClients = allClients.filter(c => c.assignedTo === agent.id);
          const agentFTDs = agentClients.filter(c => c.hasFTD);
          
          return {
            agentId: agent.id,
            agentName: `${agent.firstName} ${agent.lastName}`,
            totalClients: agentClients.length,
            ftdCount: agentFTDs.length,
            ftdAmount: agentFTDs.reduce((sum, c) => sum + parseFloat(c.ftdAmount || '0'), 0),
            conversionRate: agentClients.length > 0 ? (agentFTDs.length / agentClients.length * 100).toFixed(2) : 0,
          };
        })
        .filter(a => a.totalClients > 0)
        .sort((a, b) => b.ftdAmount - a.ftdAmount);

      // Conversion funnel stages
      const conversionFunnel = [
        { stage: 'New Leads', count: pipelineDistribution.new_lead || 0 },
        { stage: 'Contacted', count: pipelineDistribution.contacted || 0 },
        { stage: 'Qualified', count: pipelineDistribution.qualified || 0 },
        { stage: 'Deposited (FTD)', count: retentionClients },
      ];

      res.json({
        totalClients,
        salesClients,
        retentionClients,
        conversionRate: totalClients > 0 ? (retentionClients / totalClients * 100).toFixed(2) : 0,
        totalFTDAmount: totalFTDAmount.toFixed(2),
        avgFTDAmount: avgFTDAmount.toFixed(2),
        recentFTDsCount: recentFTDs.length,
        pipelineDistribution,
        timeSeries,
        conversionFunnel,
        agentPerformance,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== RETENTION DASHBOARD =====
  app.get("/api/reports/retention-dashboard", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ error: 'Unauthorized: No role assigned' });
      }

      const role = await storage.getRole(user.roleId);
      const roleName = role?.name?.toLowerCase();

      // Parse query parameters
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      const teamFilter = req.query.teamId as string | undefined;
      const agentFilter = req.query.agentId as string | undefined;

      // Get retention clients (clients with FTD)
      let retentionClients = (await storage.getClients()).filter(c => c.hasFTD);
      
      // Apply role-based filtering
      if (isAgentRole(roleName) && user.teamId) {
        retentionClients = retentionClients.filter(c => c.teamId === user.teamId);
      } else if (isTeamLeaderRole(roleName) && user.teamId) {
        retentionClients = retentionClients.filter(c => c.teamId === user.teamId);
      }

      // Apply filters
      if (teamFilter) {
        retentionClients = retentionClients.filter(c => c.teamId === teamFilter);
      }
      if (agentFilter) {
        retentionClients = retentionClients.filter(c => c.assignedTo === agentFilter);
      }

      // Get all transactions to track STD
      const allTransactions = await storage.getTransactions();
      const depositsByClient = new Map<string, any[]>();
      
      // Group deposits by client
      for (const txn of allTransactions) {
        if (txn.type === 'deposit') {
          const account = await storage.getAccount(txn.accountId);
          if (account) {
            if (!depositsByClient.has(account.clientId)) {
              depositsByClient.set(account.clientId, []);
            }
            depositsByClient.get(account.clientId)!.push(txn);
          }
        }
      }

      // Calculate STD metrics
      const clientsWithSTD = retentionClients.filter(client => {
        const deposits = depositsByClient.get(client.id) || [];
        return deposits.length >= 2; // Has 2+ deposits (FTD + STD)
      });

      const stdClients = clientsWithSTD.length;
      const stdConversionRate = retentionClients.length > 0 ? (stdClients / retentionClients.length * 100) : 0;
      
      // Calculate total STD amount (all deposits after first)
      let totalSTDAmount = 0;
      clientsWithSTD.forEach(client => {
        const deposits = (depositsByClient.get(client.id) || [])
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        
        // Sum all deposits after the first one (FTD)
        for (let i = 1; i < deposits.length; i++) {
          totalSTDAmount += parseFloat(deposits[i].amount || '0');
        }
      });

      const avgSTDAmount = stdClients > 0 ? totalSTDAmount / stdClients : 0;

      // Recent STDs (clients who made 2nd deposit in date range)
      const recentSTDs = clientsWithSTD.filter(client => {
        const deposits = (depositsByClient.get(client.id) || [])
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        
        if (deposits.length < 2) return false;
        const secondDeposit = deposits[1];
        const stdDate = new Date(secondDeposit.createdAt);
        return stdDate >= startDate && stdDate <= endDate;
      });

      // Time series data (daily STD counts)
      const timeSeries: any[] = [];
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      for (let i = 0; i <= daysDiff; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        const daySTDs = clientsWithSTD.filter(client => {
          const deposits = (depositsByClient.get(client.id) || [])
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          
          if (deposits.length < 2) return false;
          return deposits[1].createdAt?.split('T')[0] === dateStr;
        });

        const daySTDAmount = daySTDs.reduce((sum, client) => {
          const deposits = (depositsByClient.get(client.id) || [])
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          return sum + parseFloat(deposits[1]?.amount || '0');
        }, 0);

        timeSeries.push({
          date: dateStr,
          stdCount: daySTDs.length,
          stdAmount: daySTDAmount,
        });
      }

      // Agent performance for retention
      const users = await storage.getUsers();
      const agentPerformance = users
        .filter(u => u.type === 'user')
        .map(agent => {
          const agentRetClients = retentionClients.filter(c => c.assignedTo === agent.id);
          const agentSTDs = agentRetClients.filter(c => {
            const deposits = depositsByClient.get(c.id) || [];
            return deposits.length >= 2;
          });
          
          const agentSTDAmount = agentSTDs.reduce((sum, client) => {
            const deposits = (depositsByClient.get(client.id) || [])
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            let clientSTDTotal = 0;
            for (let i = 1; i < deposits.length; i++) {
              clientSTDTotal += parseFloat(deposits[i].amount || '0');
            }
            return sum + clientSTDTotal;
          }, 0);
          
          return {
            agentId: agent.id,
            agentName: `${agent.firstName} ${agent.lastName}`,
            totalRetentionClients: agentRetClients.length,
            stdCount: agentSTDs.length,
            stdAmount: agentSTDAmount,
            stdConversionRate: agentRetClients.length > 0 ? (agentSTDs.length / agentRetClients.length * 100).toFixed(2) : 0,
          };
        })
        .filter(a => a.totalRetentionClients > 0)
        .sort((a, b) => b.stdAmount - a.stdAmount);

      // Retention funnel
      const retentionFunnel = [
        { stage: 'FTD Clients', count: retentionClients.length },
        { stage: 'Active (30d)', count: retentionClients.filter(c => {
          const lastActivity = c.updatedAt || c.createdAt;
          const daysSince = (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24);
          return daysSince <= 30;
        }).length },
        { stage: 'STD Achieved', count: stdClients },
      ];

      res.json({
        totalRetentionClients: retentionClients.length,
        stdClients,
        stdConversionRate: stdConversionRate.toFixed(2),
        totalSTDAmount: totalSTDAmount.toFixed(2),
        avgSTDAmount: avgSTDAmount.toFixed(2),
        recentSTDsCount: recentSTDs.length,
        timeSeries,
        retentionFunnel,
        agentPerformance,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      });
    } catch (error: any) {
      console.error('[Retention Dashboard Error]:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== AFFILIATE MANAGEMENT =====
  app.get("/api/affiliates", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const db = storage.db;
      const affiliatesList = await db.select().from(affiliates);
      res.json(affiliatesList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/affiliates", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const db = storage.db;
      const [newAffiliate] = await db.insert(affiliates).values({
        code: req.body.code,
        name: req.body.name,
        email: req.body.email,
        commissionRate: req.body.commissionRate || '10.00',
        paymentMethod: req.body.paymentMethod,
        bankDetails: req.body.bankDetails,
        status: req.body.status || 'active',
      }).returning();

      res.json(newAffiliate);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/affiliates/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const db = storage.db;
      const [updated] = await db.update(affiliates)
        .set({
          ...req.body,
          updatedAt: new Date(),
        })
        .where(eq(affiliates.id, req.params.id))
        .returning();

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/affiliates/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const db = storage.db;
      await db.delete(affiliates).where(eq(affiliates.id, req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/affiliates/:id/referrals", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const db = storage.db;
      const referrals = await db.select().from(affiliateReferrals)
        .where(eq(affiliateReferrals.affiliateId, req.params.id));
      res.json(referrals);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/affiliates/:id/referrals", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const db = storage.db;
      const [newReferral] = await db.insert(affiliateReferrals).values({
        affiliateId: req.params.id,
        clientId: req.body.clientId,
        commissionEarned: req.body.commissionEarned || '0',
        status: req.body.status || 'pending',
      }).returning();

      res.json(newReferral);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/affiliates/:id/commissions", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const db = storage.db;
      const referrals = await db.select().from(affiliateReferrals)
        .where(eq(affiliateReferrals.affiliateId, req.params.id));

      const total = referrals.reduce((sum, r) => sum + parseFloat(r.commissionEarned || '0'), 0);
      const pending = referrals.filter(r => r.status === 'pending').reduce((sum, r) => sum + parseFloat(r.commissionEarned || '0'), 0);
      const paid = referrals.filter(r => r.status === 'paid').reduce((sum, r) => sum + parseFloat(r.commissionEarned || '0'), 0);

      res.json({
        total: total.toFixed(2),
        pending: pending.toFixed(2),
        paid: paid.toFixed(2),
        referralCount: referrals.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/affiliates/:id/payout", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const db = storage.db;
      const referralIds = req.body.referralIds || [];

      await db.update(affiliateReferrals)
        .set({
          status: 'paid',
          paidAt: new Date(),
        })
        .where(and(
          eq(affiliateReferrals.affiliateId, req.params.id),
          eq(affiliateReferrals.status, 'pending')
        ));

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/reports/affiliate-dashboard", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const db = storage.db;
      const affiliatesList = await db.select().from(affiliates);
      
      const leaderboard = await Promise.all(
        affiliatesList.map(async (affiliate) => {
          const referrals = await db.select().from(affiliateReferrals)
            .where(eq(affiliateReferrals.affiliateId, affiliate.id));

          const totalCommission = referrals.reduce((sum, r) => sum + parseFloat(r.commissionEarned || '0'), 0);
          const pendingCommission = referrals.filter(r => r.status === 'pending').reduce((sum, r) => sum + parseFloat(r.commissionEarned || '0'), 0);

          return {
            affiliateId: affiliate.id,
            affiliateName: affiliate.name,
            code: affiliate.code,
            referralCount: referrals.length,
            totalCommission: totalCommission.toFixed(2),
            pendingCommission: pendingCommission.toFixed(2),
            commissionRate: affiliate.commissionRate,
          };
        })
      );

      leaderboard.sort((a, b) => parseFloat(b.totalCommission) - parseFloat(a.totalCommission));

      const allReferrals = await db.select().from(affiliateReferrals);
      const totalCommissions = allReferrals.reduce((sum, r) => sum + parseFloat(r.commissionEarned || '0'), 0);
      const pendingPayouts = allReferrals.filter(r => r.status === 'pending').reduce((sum, r) => sum + parseFloat(r.commissionEarned || '0'), 0);

      res.json({
        totalAffiliates: affiliatesList.length,
        activeAffiliates: affiliatesList.filter(a => a.status === 'active').length,
        totalReferrals: allReferrals.length,
        totalCommissions: totalCommissions.toFixed(2),
        pendingPayouts: pendingPayouts.toFixed(2),
        leaderboard,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== PHASE 5: ADVANCED CONFIGURATION ====================

  // Organizational Hierarchy
  app.get("/api/hierarchy/tree", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const allTeams = await storage.getTeams();
      
      // Build hierarchical tree structure
      const teamMap = new Map();
      const rootTeams: any[] = [];
      
      // First pass: create map of all teams
      allTeams.forEach(team => {
        teamMap.set(team.id, { ...team, children: [] });
      });
      
      // Second pass: build tree structure
      allTeams.forEach(team => {
        const teamNode = teamMap.get(team.id);
        if (team.parentTeamId) {
          const parent = teamMap.get(team.parentTeamId);
          if (parent) {
            parent.children.push(teamNode);
          } else {
            // Parent not found, treat as root
            rootTeams.push(teamNode);
          }
        } else {
          // No parent, this is a root team
          rootTeams.push(teamNode);
        }
      });
      
      res.json(rootTeams);
    } catch (error: any) {
      console.error('[Hierarchy Tree Error]:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/teams/:id/children", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const db = storage.db;
      const childTeams = await db.select().from(teams)
        .where(eq(teams.parentTeamId, req.params.id));
      
      res.json(childTeams);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/teams/:id/rollup", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const db = storage.db;
      const team = await db.select().from(teams).where(eq(teams.id, req.params.id)).limit(1);
      if (!team.length) {
        return res.status(404).json({ error: 'Team not found' });
      }

      const teamClients = await db.select().from(clients).where(eq(clients.teamId, req.params.id));
      const ftdClients = teamClients.filter(c => c.hasFTD);
      
      const childTeams = await db.select().from(teams).where(eq(teams.parentTeamId, req.params.id));
      const childMetrics = await Promise.all(childTeams.map(async (childTeam) => {
        const childClients = await db.select().from(clients).where(eq(clients.teamId, childTeam.id));
        return {
          teamId: childTeam.id,
          teamName: childTeam.name,
          totalClients: childClients.length,
          ftdCount: childClients.filter(c => c.hasFTD).length,
        };
      }));

      res.json({
        teamId: team[0].id,
        teamName: team[0].name,
        totalClients: teamClients.length,
        ftdCount: ftdClients.length,
        childTeams: childMetrics,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Team Routing Rules (Language-based auto-transfer)
  app.get("/api/team-routing-rules", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ error: 'Unauthorized: No role assigned' });
      }

      const role = await storage.getRole(user.roleId);
      const permissions = (role?.permissions as string[]) || [];
      
      if (!permissions.includes('team.manage') && role?.name?.toLowerCase() !== 'administrator') {
        return res.status(403).json({ error: 'Unauthorized: Insufficient permissions' });
      }

      const db = storage.db;
      const rules = await db.select().from(teamRoutingRules);
      res.json(rules);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/team-routing-rules", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ error: 'Unauthorized: No role assigned' });
      }

      const role = await storage.getRole(user.roleId);
      const permissions = (role?.permissions as string[]) || [];
      
      if (!permissions.includes('team.manage') && role?.name?.toLowerCase() !== 'administrator') {
        return res.status(403).json({ error: 'Unauthorized: Insufficient permissions' });
      }

      const validated = insertTeamRoutingRuleSchema.parse(req.body);

      const db = storage.db;
      const [newRule] = await db.insert(teamRoutingRules).values(validated).returning();

      await storage.createAuditLog({
        userId: user.id,
        action: 'routing_rule_create',
        details: { rule: newRule },
      });

      res.json(newRule);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/team-routing-rules/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ error: 'Unauthorized: No role assigned' });
      }

      const role = await storage.getRole(user.roleId);
      const permissions = (role?.permissions as string[]) || [];
      
      if (!permissions.includes('team.manage') && role?.name?.toLowerCase() !== 'administrator') {
        return res.status(403).json({ error: 'Unauthorized: Insufficient permissions' });
      }

      const db = storage.db;
      const [updatedRule] = await db.update(teamRoutingRules)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(teamRoutingRules.id, req.params.id))
        .returning();

      await storage.createAuditLog({
        userId: user.id,
        action: 'routing_rule_edit',
        details: { ruleId: req.params.id, changes: req.body },
      });

      res.json(updatedRule);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/team-routing-rules/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ error: 'Unauthorized: No role assigned' });
      }

      const role = await storage.getRole(user.roleId);
      const permissions = (role?.permissions as string[]) || [];
      
      if (!permissions.includes('team.manage') && role?.name?.toLowerCase() !== 'administrator') {
        return res.status(403).json({ error: 'Unauthorized: Insufficient permissions' });
      }

      const db = storage.db;
      await db.delete(teamRoutingRules).where(eq(teamRoutingRules.id, req.params.id));

      await storage.createAuditLog({
        userId: user.id,
        action: 'routing_rule_delete',
        details: { ruleId: req.params.id },
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Smart Assignment Settings
  app.get("/api/smart-assignment-settings", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ error: 'Unauthorized: No role assigned' });
      }

      const role = await storage.getRole(user.roleId);
      const permissions = (role?.permissions as string[]) || [];
      
      if (!permissions.includes('team.manage') && role?.name?.toLowerCase() !== 'administrator') {
        return res.status(403).json({ error: 'Unauthorized: Insufficient permissions' });
      }

      const db = storage.db;
      const { teamId } = req.query;

      let query = db.select().from(smartAssignmentSettings);
      
      if (teamId) {
        query = query.where(eq(smartAssignmentSettings.teamId, teamId as string));
      } else {
        // Get global settings (where teamId is null)
        query = query.where(sql`${smartAssignmentSettings.teamId} IS NULL`);
      }

      const settings = await query;
      
      if (settings.length === 0) {
        // Return default settings if none exist
        return res.json({
          isEnabled: false,
          useWorkloadBalance: true,
          useLanguageMatch: true,
          usePerformanceHistory: true,
          useAvailability: true,
          useRoundRobin: true,
          teamId: teamId || null,
        });
      }

      res.json(settings[0]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all team-specific settings
  app.get("/api/smart-assignment-settings/teams", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ error: 'Unauthorized: No role assigned' });
      }

      const role = await storage.getRole(user.roleId);
      const permissions = (role?.permissions as string[]) || [];
      
      if (!permissions.includes('team.manage') && role?.name?.toLowerCase() !== 'administrator') {
        return res.status(403).json({ error: 'Unauthorized: Insufficient permissions' });
      }

      const db = storage.db;
      
      // Get all team-specific settings (where teamId is NOT NULL)
      const settings = await db.select()
        .from(smartAssignmentSettings)
        .where(sql`${smartAssignmentSettings.teamId} IS NOT NULL`);

      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/smart-assignment-settings", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ error: 'Unauthorized: No role assigned' });
      }

      const role = await storage.getRole(user.roleId);
      const permissions = (role?.permissions as string[]) || [];
      
      if (!permissions.includes('team.manage') && role?.name?.toLowerCase() !== 'administrator') {
        return res.status(403).json({ error: 'Unauthorized: Insufficient permissions' });
      }

      const validated = insertSmartAssignmentSettingSchema.parse(req.body);

      const db = storage.db;
      
      // Check if settings already exist
      const { teamId } = validated;
      let existing;
      
      if (teamId) {
        existing = await db.select()
          .from(smartAssignmentSettings)
          .where(eq(smartAssignmentSettings.teamId, teamId))
          .limit(1);
      } else {
        existing = await db.select()
          .from(smartAssignmentSettings)
          .where(sql`${smartAssignmentSettings.teamId} IS NULL`)
          .limit(1);
      }

      let result;
      if (existing.length > 0) {
        // Update existing settings
        const [updated] = await db.update(smartAssignmentSettings)
          .set({ ...validated, updatedAt: new Date() })
          .where(eq(smartAssignmentSettings.id, existing[0].id))
          .returning();
        result = updated;
      } else {
        // Create new settings
        const [created] = await db.insert(smartAssignmentSettings)
          .values(validated)
          .returning();
        result = created;
      }

      await storage.createAuditLog({
        userId: user.id,
        action: 'smart_assignment_config',
        details: { 
          teamId: teamId || 'global',
          settings: validated,
        },
      });

      res.json(result);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/smart-assignment-settings/toggle", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ error: 'Unauthorized: No role assigned' });
      }

      const role = await storage.getRole(user.roleId);
      const permissions = (role?.permissions as string[]) || [];
      
      if (!permissions.includes('team.manage') && role?.name?.toLowerCase() !== 'administrator') {
        return res.status(403).json({ error: 'Unauthorized: Insufficient permissions' });
      }

      const { isEnabled, teamId } = req.body;
      const db = storage.db;

      let settings;
      if (teamId) {
        settings = await db.select()
          .from(smartAssignmentSettings)
          .where(eq(smartAssignmentSettings.teamId, teamId))
          .limit(1);
      } else {
        settings = await db.select()
          .from(smartAssignmentSettings)
          .where(sql`${smartAssignmentSettings.teamId} IS NULL`)
          .limit(1);
      }

      let result;
      if (settings.length > 0) {
        const [updated] = await db.update(smartAssignmentSettings)
          .set({ isEnabled, updatedAt: new Date() })
          .where(eq(smartAssignmentSettings.id, settings[0].id))
          .returning();
        result = updated;
      } else {
        // Create with default settings
        const [created] = await db.insert(smartAssignmentSettings)
          .values({
            isEnabled,
            teamId: teamId || null,
            useWorkloadBalance: true,
            useLanguageMatch: true,
            usePerformanceHistory: true,
            useAvailability: true,
            useRoundRobin: true,
          })
          .returning();
        result = created;
      }

      await storage.createAuditLog({
        userId: user.id,
        action: 'smart_assignment_toggle',
        details: { 
          teamId: teamId || 'global',
          isEnabled,
        },
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete team-specific smart assignment settings
  app.delete("/api/smart-assignment-settings/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ error: 'Unauthorized: No role assigned' });
      }

      const role = await storage.getRole(user.roleId);
      const permissions = (role?.permissions as string[]) || [];
      
      if (!permissions.includes('team.manage') && role?.name?.toLowerCase() !== 'administrator') {
        return res.status(403).json({ error: 'Unauthorized: Insufficient permissions' });
      }

      const db = storage.db;
      await db.delete(smartAssignmentSettings).where(eq(smartAssignmentSettings.id, req.params.id));

      await storage.createAuditLog({
        userId: user.id,
        action: 'smart_assignment_delete',
        details: { settingId: req.params.id },
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Agent Workload Management
  app.get("/api/agents/:id/workload", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ error: 'Unauthorized: No role assigned' });
      }

      const role = await storage.getRole(user.roleId);
      const permissions = (role?.permissions as string[]) || [];
      const roleName = role?.name?.toLowerCase();
      
      // Team leaders can view their team members' workload, managers/admins can view all
      const agent = await storage.getUser(req.params.id);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      const canView = 
        roleName === 'administrator' ||
        roleName?.includes('manager') ||
        (roleName === 'team leader' && user.teamId === agent.teamId) ||
        user.id === agent.id; // Agent can view own workload

      if (!canView) {
        return res.status(403).json({ error: 'Unauthorized: Cannot view this agent\'s workload' });
      }

      // Get active clients count for this agent
      const clients = await storage.getClients();
      const activeClients = clients.filter(
        c => c.assignedAgentId === agent.id && c.isActive
      );

      res.json({
        agentId: agent.id,
        agentName: agent.name,
        currentWorkload: agent.currentWorkload,
        maxWorkload: agent.maxWorkload,
        actualActiveClients: activeClients.length,
        isAvailable: agent.isAvailable,
        utilizationRate: agent.maxWorkload > 0 
          ? ((agent.currentWorkload / agent.maxWorkload) * 100).toFixed(2) 
          : '0',
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/agents/:id/workload", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ error: 'Unauthorized: No role assigned' });
      }

      const role = await storage.getRole(user.roleId);
      const roleName = role?.name?.toLowerCase();
      
      // Only Team Leaders, Managers, and Admins can adjust workload
      const agent = await storage.getUser(req.params.id);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      const canAdjust = 
        roleName === 'administrator' ||
        roleName?.includes('manager') ||
        (roleName === 'team leader' && user.teamId === agent.teamId);

      if (!canAdjust) {
        return res.status(403).json({ error: 'Unauthorized: Only Team Leaders, Managers, and Admins can adjust workload' });
      }

      const { maxWorkload, isAvailable } = req.body;
      const db = storage.db;
      const updates: any = {};

      if (maxWorkload !== undefined) {
        if (maxWorkload < 1 || maxWorkload > 1000) {
          return res.status(400).json({ error: 'Max workload must be between 1 and 1000' });
        }
        updates.maxWorkload = maxWorkload;
      }

      if (isAvailable !== undefined) {
        updates.isAvailable = isAvailable;
      }

      const [updated] = await db.update(users)
        .set(updates)
        .where(eq(users.id, req.params.id))
        .returning();

      await storage.createAuditLog({
        userId: user.id,
        action: 'workload_adjusted',
        targetType: 'user',
        targetId: agent.id,
        details: { 
          agentName: agent.name,
          changes: updates,
          previousMaxWorkload: agent.maxWorkload,
          previousAvailability: agent.isAvailable,
        },
      });

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Custom Statuses
  app.get("/api/custom-statuses", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const db = storage.db;
      const statusList = await db.select().from(customStatuses).orderBy(customStatuses.sortOrder);
      res.json(statusList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/custom-statuses", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const db = storage.db;
      const [newStatus] = await db.insert(customStatuses).values({
        name: req.body.name,
        color: req.body.color,
        icon: req.body.icon,
        category: req.body.category,
        allowedTransitions: req.body.allowedTransitions || [],
        automationTriggers: req.body.automationTriggers || [],
        sortOrder: req.body.sortOrder || 0,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      }).returning();

      res.json(newStatus);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/custom-statuses/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const db = storage.db;
      const [updated] = await db.update(customStatuses)
        .set(req.body)
        .where(eq(customStatuses.id, req.params.id))
        .returning();

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/custom-statuses/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const db = storage.db;
      await db.delete(customStatuses).where(eq(customStatuses.id, req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // KYC Questions
  app.get("/api/kyc-questions", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const db = storage.db;
      const questions = await db.select().from(kycQuestions).orderBy(kycQuestions.sortOrder);
      res.json(questions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/kyc-questions", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const db = storage.db;
      const [newQuestion] = await db.insert(kycQuestions).values({
        question: req.body.question,
        questionType: req.body.questionType,
        options: req.body.options || [],
        validation: req.body.validation || {},
        conditionalLogic: req.body.conditionalLogic || {},
        isRequired: req.body.isRequired !== undefined ? req.body.isRequired : true,
        sortOrder: req.body.sortOrder,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      }).returning();

      res.json(newQuestion);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/kyc-questions/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const db = storage.db;
      const [updated] = await db.update(kycQuestions)
        .set(req.body)
        .where(eq(kycQuestions.id, req.params.id))
        .returning();

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/kyc-questions/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const db = storage.db;
      await db.delete(kycQuestions).where(eq(kycQuestions.id, req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Template Variables
  app.get("/api/template-variables", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const db = storage.db;
      const variables = await db.select().from(templateVariables);
      res.json(variables);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/template-variables", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const db = storage.db;
      const [newVariable] = await db.insert(templateVariables).values({
        name: req.body.name,
        description: req.body.description,
        variableType: req.body.variableType,
        dataSource: req.body.dataSource,
        computationLogic: req.body.computationLogic,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      }).returning();

      res.json(newVariable);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/template-variables/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const db = storage.db;
      const [updated] = await db.update(templateVariables)
        .set(req.body)
        .where(eq(templateVariables.id, req.params.id))
        .returning();

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/template-variables/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const db = storage.db;
      await db.delete(templateVariables).where(eq(templateVariables.id, req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Security Settings
  app.get("/api/security-settings", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const db = storage.db;
      const settings = await db.select().from(securitySettings);
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/security-settings", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const db = storage.db;
      
      const existing = await db.select().from(securitySettings)
        .where(eq(securitySettings.settingKey, req.body.settingKey))
        .limit(1);

      let result;
      if (existing.length > 0) {
        [result] = await db.update(securitySettings)
          .set({
            settingValue: req.body.settingValue,
            description: req.body.description,
            updatedBy: req.user?.id,
            updatedAt: new Date(),
          })
          .where(eq(securitySettings.settingKey, req.body.settingKey))
          .returning();
      } else {
        [result] = await db.insert(securitySettings).values({
          settingKey: req.body.settingKey,
          settingValue: req.body.settingValue,
          description: req.body.description,
          updatedBy: req.user?.id,
        }).returning();
      }

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/security-settings/:key", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.user?.type !== 'user') {
        return res.status(403).json({ error: 'Unauthorized: Staff only' });
      }

      const db = storage.db;
      await db.delete(securitySettings).where(eq(securitySettings.settingKey, req.params.key));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== PHASE 6: PAYMENT INTEGRATION ====================

  // SMTP Settings
  app.get("/api/smtp-settings", authMiddleware, async (req: AuthRequest, res) => {
    try {
      // Check if user is admin (has role management permissions)
      const hasPermission = await storage.hasPermission(req.user!.id, 'role.edit');
      if (!hasPermission) {
        return res.status(403).json({ error: 'Unauthorized: Admin only' });
      }

      const db = storage.db;
      const settings = await db.select().from(smtpSettings);
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/smtp-settings", authMiddleware, async (req: AuthRequest, res) => {
    try {
      // Check if user is admin (has role management permissions)
      const hasPermission = await storage.hasPermission(req.user!.id, 'role.edit');
      if (!hasPermission) {
        return res.status(403).json({ error: 'Unauthorized: Admin only' });
      }

      // Import insertSmtpSettingSchema from schema
      const { insertSmtpSettingSchema } = await import("@shared/schema");
      const validated = insertSmtpSettingSchema.parse(req.body);

      const db = storage.db;
      const [result] = await db.insert(smtpSettings).values(validated).returning();
      res.json(result);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation failed', details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/smtp-settings/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      // Check if user is admin (has role management permissions)
      const hasPermission = await storage.hasPermission(req.user!.id, 'role.edit');
      if (!hasPermission) {
        return res.status(403).json({ error: 'Unauthorized: Admin only' });
      }

      // Import insertSmtpSettingSchema from schema
      const { insertSmtpSettingSchema } = await import("@shared/schema");
      const validated = insertSmtpSettingSchema.partial().parse(req.body);

      const db = storage.db;
      const [result] = await db.update(smtpSettings)
        .set({ ...validated, updatedAt: new Date() })
        .where(eq(smtpSettings.id, req.params.id))
        .returning();
      res.json(result);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation failed', details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/smtp-settings/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      // Check if user is admin (has role management permissions)
      const hasPermission = await storage.hasPermission(req.user!.id, 'role.edit');
      if (!hasPermission) {
        return res.status(403).json({ error: 'Unauthorized: Admin only' });
      }

      const db = storage.db;
      await db.delete(smtpSettings).where(eq(smtpSettings.id, req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Payment Providers
  app.get("/api/payment-providers", authMiddleware, async (req: AuthRequest, res) => {
    try {
      // Check if user is admin (has role management permissions)
      const hasPermission = await storage.hasPermission(req.user!.id, 'role.edit');
      if (!hasPermission) {
        return res.status(403).json({ error: 'Unauthorized: Admin only' });
      }

      const db = storage.db;
      const providers = await db.select().from(paymentProviders);
      res.json(providers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/payment-providers", authMiddleware, async (req: AuthRequest, res) => {
    try {
      // Check if user is admin (has role management permissions)
      const hasPermission = await storage.hasPermission(req.user!.id, 'role.edit');
      if (!hasPermission) {
        return res.status(403).json({ error: 'Unauthorized: Admin only' });
      }

      // Import insertPaymentProviderSchema from schema
      const { insertPaymentProviderSchema } = await import("@shared/schema");
      const validated = insertPaymentProviderSchema.parse(req.body);

      const db = storage.db;
      const [result] = await db.insert(paymentProviders).values(validated).returning();
      res.json(result);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation failed', details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/payment-providers/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      // Check if user is admin (has role management permissions)
      const hasPermission = await storage.hasPermission(req.user!.id, 'role.edit');
      if (!hasPermission) {
        return res.status(403).json({ error: 'Unauthorized: Admin only' });
      }

      // Import insertPaymentProviderSchema from schema
      const { insertPaymentProviderSchema } = await import("@shared/schema");
      const validated = insertPaymentProviderSchema.partial().parse(req.body);

      const db = storage.db;
      const [result] = await db.update(paymentProviders)
        .set({ ...validated, updatedAt: new Date() })
        .where(eq(paymentProviders.id, req.params.id))
        .returning();
      res.json(result);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation failed', details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/payment-providers/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      // Check if user is admin (has role management permissions)
      const hasPermission = await storage.hasPermission(req.user!.id, 'role.edit');
      if (!hasPermission) {
        return res.status(403).json({ error: 'Unauthorized: Admin only' });
      }

      const db = storage.db;
      await db.delete(paymentProviders).where(eq(paymentProviders.id, req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
