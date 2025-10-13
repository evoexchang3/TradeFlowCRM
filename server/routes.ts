import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import express from "express";
import bcrypt from "bcrypt";
import multer from "multer";
import { z } from "zod";
import { storage } from "./storage";
import { twelveDataService } from "./services/twelve-data";
import { tradingEngine } from "./services/trading-engine";
import { authMiddleware, optionalAuth, generateToken, verifyToken, type AuthRequest } from "./middleware/auth";
import { previewImport, executeImport } from "./import";

// Helper to generate account number
function generateAccountNumber(): string {
  return 'ACC' + Date.now() + Math.floor(Math.random() * 1000);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Middleware for JSON parsing
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

      res.json(clients);
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

  app.post("/api/clients", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = req.body;
      const hashedPassword = await bcrypt.hash(data.password || 'Welcome123!', 10);

      const client = await storage.createClient({
        ...data,
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
      res.json(comments);
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

  // ===== TRADING =====
  app.post("/api/orders", authMiddleware, async (req: AuthRequest, res) => {
    try {
      // For clients, get their account. For admin users, they can specify accountId
      let accountId = req.body.accountId;
      
      if (req.user?.type === 'client') {
        const client = await storage.getClientByEmail(req.user.email);
        const account = await storage.getAccountByClientId(client!.id);
        if (!account) {
          return res.status(400).json({ error: "No account found for client" });
        }
        accountId = account.id;
      } else if (!accountId) {
        return res.status(400).json({ error: "accountId required for admin users" });
      }

      const order = await tradingEngine.placeOrder({
        ...req.body,
        accountId,
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

  return httpServer;
}
