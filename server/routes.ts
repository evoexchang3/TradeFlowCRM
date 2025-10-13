import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import express from "express";
import bcrypt from "bcrypt";
import multer from "multer";
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
      const clients = await storage.getClients();
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

  // ===== API KEY MANAGEMENT =====
  app.post("/api/admin/api-keys", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { insertApiKeySchema } = await import("@shared/schema");
      const { generateApiKey } = await import("./utils/api-key");

      // Validate request body
      const validated = insertApiKeySchema.parse(req.body);

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
