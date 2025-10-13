// Referenced from blueprint:javascript_database - adapted for trading platform CRM
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  users, clients, accounts, subaccounts, transactions, internalTransfers, orders, positions, roles, teams, auditLogs, callLogs, clientComments, marketData, candles, apiKeys,
  type User, type InsertUser,
  type Client, type InsertClient,
  type Account, type InsertAccount,
  type Subaccount, type InsertSubaccount,
  type Transaction, type InsertTransaction,
  type Order, type InsertOrder,
  type Position, type InsertPosition,
  type Role, type InsertRole,
  type Team, type InsertTeam,
  type AuditLog, type InsertAuditLog,
  type CallLog, type InsertCallLog,
  type ClientComment, type InsertClientComment,
  type ApiKey, type InsertApiKey,
  type InternalTransfer, type InsertInternalTransfer,
  type MarketData,
  type Candle,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User>;
  
  // Clients
  getClient(id: string): Promise<Client | undefined>;
  getClientByEmail(email: string): Promise<Client | undefined>;
  getClients(filters?: any): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, updates: Partial<InsertClient>): Promise<Client>;
  
  // Accounts
  getAccount(id: string): Promise<Account | undefined>;
  getAccountByClientId(clientId: string): Promise<Account | undefined>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: string, updates: Partial<InsertAccount>): Promise<Account>;
  
  // Subaccounts
  getSubaccount(id: string): Promise<Subaccount | undefined>;
  getSubaccountsByAccountId(accountId: string): Promise<Subaccount[]>;
  createSubaccount(subaccount: InsertSubaccount): Promise<Subaccount>;
  updateSubaccount(id: string, updates: Partial<InsertSubaccount>): Promise<Subaccount>;
  
  // Transactions
  getTransactions(filters?: any): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: string, updates: Partial<InsertTransaction>): Promise<Transaction>;
  
  // Internal Transfers
  getInternalTransfers(filters?: any): Promise<InternalTransfer[]>;
  createInternalTransfer(transfer: InsertInternalTransfer): Promise<InternalTransfer>;
  executeInternalTransfer(transferId: string): Promise<InternalTransfer>;
  
  // Orders
  getOrder(id: string): Promise<Order | undefined>;
  getOrders(filters?: any): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, updates: Partial<InsertOrder>): Promise<Order>;
  
  // Positions
  getPositions(filters?: any): Promise<Position[]>;
  getPosition(id: string): Promise<Position | undefined>;
  createPosition(position: InsertPosition): Promise<Position>;
  updatePosition(id: string, updates: Partial<InsertPosition>): Promise<Position>;
  
  // Roles
  getRoles(): Promise<Role[]>;
  getRole(id: string): Promise<Role | undefined>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: string, updates: Partial<InsertRole>): Promise<Role>;
  deleteRole(id: string): Promise<void>;
  
  // Teams
  getTeams(): Promise<Team[]>;
  getTeam(id: string): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: string, updates: Partial<InsertTeam>): Promise<Team>;
  
  // Audit Logs
  getAuditLogs(filters?: any): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  
  // Call Logs
  createCallLog(log: InsertCallLog): Promise<CallLog>;
  
  // Client Comments
  getClientComments(clientId: string): Promise<ClientComment[]>;
  createClientComment(comment: InsertClientComment): Promise<ClientComment>;
  updateClientComment(id: string, updates: Partial<InsertClientComment>): Promise<ClientComment>;
  deleteClientComment(id: string): Promise<void>;
  
  // API Keys
  getApiKeys(createdBy?: string): Promise<ApiKey[]>;
  getApiKey(id: string): Promise<ApiKey | undefined>;
  getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined>;
  createApiKey(key: InsertApiKey & { keyHash: string; keyPrefix: string }): Promise<ApiKey>;
  revokeApiKey(id: string): Promise<ApiKey>;
  updateApiKeyLastUsed(id: string): Promise<void>;
  
  // Market Data
  getMarketData(symbol: string): Promise<MarketData | undefined>;
  updateMarketData(symbol: string, data: Partial<MarketData>): Promise<MarketData>;
  
  // Candles
  getCandles(symbol: string, interval: string, limit?: number): Promise<Candle[]>;
  saveCandles(candleData: Candle[]): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  // Clients
  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }

  async getClientByEmail(email: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.email, email));
    return client || undefined;
  }

  async getClients(filters?: any): Promise<Client[]> {
    return await db.select().from(clients).orderBy(desc(clients.createdAt));
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(insertClient).returning();
    return client;
  }

  async updateClient(id: string, updates: Partial<InsertClient>): Promise<Client> {
    const [client] = await db.update(clients).set({ ...updates, updatedAt: new Date() }).where(eq(clients.id, id)).returning();
    return client;
  }

  // Accounts
  async getAccount(id: string): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, id));
    return account || undefined;
  }

  async getAccountByClientId(clientId: string): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.clientId, clientId));
    return account || undefined;
  }

  async createAccount(insertAccount: InsertAccount): Promise<Account> {
    const [account] = await db.insert(accounts).values(insertAccount).returning();
    return account;
  }

  async updateAccount(id: string, updates: Partial<InsertAccount>): Promise<Account> {
    const [account] = await db.update(accounts).set(updates).where(eq(accounts.id, id)).returning();
    return account;
  }

  // Subaccounts
  async getSubaccount(id: string): Promise<Subaccount | undefined> {
    const [subaccount] = await db.select().from(subaccounts).where(eq(subaccounts.id, id));
    return subaccount || undefined;
  }

  async getSubaccountsByAccountId(accountId: string): Promise<Subaccount[]> {
    return await db.select().from(subaccounts).where(eq(subaccounts.accountId, accountId)).orderBy(desc(subaccounts.createdAt));
  }

  async createSubaccount(insertSubaccount: InsertSubaccount): Promise<Subaccount> {
    const [subaccount] = await db.insert(subaccounts).values(insertSubaccount).returning();
    return subaccount;
  }

  async updateSubaccount(id: string, updates: Partial<InsertSubaccount>): Promise<Subaccount> {
    const [subaccount] = await db.update(subaccounts).set(updates).where(eq(subaccounts.id, id)).returning();
    return subaccount;
  }

  // Transactions
  async getTransactions(filters?: any): Promise<Transaction[]> {
    return await db.select().from(transactions).orderBy(desc(transactions.createdAt));
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db.insert(transactions).values(insertTransaction).returning();
    return transaction;
  }

  async updateTransaction(id: string, updates: Partial<InsertTransaction>): Promise<Transaction> {
    const [transaction] = await db.update(transactions).set(updates).where(eq(transactions.id, id)).returning();
    return transaction;
  }

  // Internal Transfers
  async getInternalTransfers(filters?: any): Promise<InternalTransfer[]> {
    if (filters?.accountId) {
      // Get transfers for subaccounts belonging to this account
      const accountSubaccounts = await this.getSubaccountsByAccountId(filters.accountId);
      const subaccountIds = accountSubaccounts.map(s => s.id);
      
      // Return empty array if account has no subaccounts (prevents data leak)
      if (subaccountIds.length === 0) {
        return [];
      }
      
      return await db.select().from(internalTransfers).where(
        sql`${internalTransfers.fromSubaccountId} = ANY(${subaccountIds}) OR ${internalTransfers.toSubaccountId} = ANY(${subaccountIds})`
      ).orderBy(desc(internalTransfers.createdAt));
    }
    
    return await db.select().from(internalTransfers).orderBy(desc(internalTransfers.createdAt));
  }

  async createInternalTransfer(transfer: InsertInternalTransfer): Promise<InternalTransfer> {
    const [internalTransfer] = await db.insert(internalTransfers).values(transfer).returning();
    return internalTransfer;
  }

  async executeInternalTransfer(transferId: string): Promise<InternalTransfer> {
    // Get the transfer first (outside transaction)
    const [transfer] = await db.select().from(internalTransfers).where(eq(internalTransfers.id, transferId));
    
    if (!transfer) {
      throw new Error('Transfer not found');
    }
    
    if (transfer.status !== 'pending') {
      throw new Error('Transfer already processed');
    }

    // Get both subaccounts to validate
    const [fromSubaccount] = await db.select().from(subaccounts).where(eq(subaccounts.id, transfer.fromSubaccountId));
    const [toSubaccount] = await db.select().from(subaccounts).where(eq(subaccounts.id, transfer.toSubaccountId));

    if (!fromSubaccount || !toSubaccount) {
      throw new Error('Subaccount not found');
    }

    // Validate balance
    const fromBalance = parseFloat(fromSubaccount.balance);
    const transferAmount = parseFloat(transfer.amount);

    if (fromBalance < transferAmount) {
      // Mark as rejected and return (no throw, so audit logging can proceed)
      const [rejectedTransfer] = await db.update(internalTransfers)
        .set({ status: 'rejected' })
        .where(eq(internalTransfers.id, transferId))
        .returning();
      return rejectedTransfer;
    }

    // Execute transfer with atomic balance updates
    return await db.transaction(async (tx) => {
      // Update balances atomically
      await tx.update(subaccounts)
        .set({ 
          balance: sql`${subaccounts.balance} - ${transferAmount}`,
          equity: sql`${subaccounts.equity} - ${transferAmount}`
        })
        .where(eq(subaccounts.id, transfer.fromSubaccountId));

      await tx.update(subaccounts)
        .set({ 
          balance: sql`${subaccounts.balance} + ${transferAmount}`,
          equity: sql`${subaccounts.equity} + ${transferAmount}`
        })
        .where(eq(subaccounts.id, transfer.toSubaccountId));

      // Mark transfer as completed
      const [completedTransfer] = await tx.update(internalTransfers)
        .set({ 
          status: 'completed',
          completedAt: new Date()
        })
        .where(eq(internalTransfers.id, transferId))
        .returning();

      return completedTransfer;
    });
  }

  // Orders
  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async getOrders(filters?: any): Promise<Order[]> {
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(insertOrder).returning();
    return order;
  }

  async updateOrder(id: string, updates: Partial<InsertOrder>): Promise<Order> {
    const [order] = await db.update(orders).set(updates).where(eq(orders.id, id)).returning();
    return order;
  }

  // Positions
  async getPositions(filters?: any): Promise<Position[]> {
    return await db.select().from(positions).where(eq(positions.status, 'open')).orderBy(desc(positions.openedAt));
  }

  async getPosition(id: string): Promise<Position | undefined> {
    const [position] = await db.select().from(positions).where(eq(positions.id, id));
    return position || undefined;
  }

  async createPosition(insertPosition: InsertPosition): Promise<Position> {
    const [position] = await db.insert(positions).values(insertPosition).returning();
    return position;
  }

  async updatePosition(id: string, updates: Partial<InsertPosition>): Promise<Position> {
    const [position] = await db.update(positions).set(updates).where(eq(positions.id, id)).returning();
    return position;
  }

  // Roles
  async getRoles(): Promise<Role[]> {
    return await db.select().from(roles).orderBy(roles.name);
  }

  async getRole(id: string): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    return role || undefined;
  }

  async createRole(insertRole: InsertRole): Promise<Role> {
    const [role] = await db.insert(roles).values(insertRole).returning();
    return role;
  }

  async updateRole(id: string, updates: Partial<InsertRole>): Promise<Role> {
    const [role] = await db.update(roles).set({ ...updates, updatedAt: new Date() }).where(eq(roles.id, id)).returning();
    return role;
  }

  async deleteRole(id: string): Promise<void> {
    await db.delete(roles).where(eq(roles.id, id));
  }

  // Teams
  async getTeams(): Promise<Team[]> {
    return await db.select().from(teams).orderBy(teams.name);
  }

  async getTeam(id: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team || undefined;
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const [team] = await db.insert(teams).values(insertTeam).returning();
    return team;
  }

  async updateTeam(id: string, updates: Partial<InsertTeam>): Promise<Team> {
    const [team] = await db.update(teams).set(updates).where(eq(teams.id, id)).returning();
    return team;
  }

  // Audit Logs
  async getAuditLogs(filters?: any): Promise<AuditLog[]> {
    return await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100);
  }

  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(insertLog).returning();
    return log;
  }

  // Call Logs
  async createCallLog(insertLog: InsertCallLog): Promise<CallLog> {
    const [log] = await db.insert(callLogs).values(insertLog).returning();
    return log;
  }

  // Client Comments
  async getClientComments(clientId: string): Promise<ClientComment[]> {
    return await db.select().from(clientComments)
      .where(eq(clientComments.clientId, clientId))
      .orderBy(desc(clientComments.createdAt));
  }

  async createClientComment(insertComment: InsertClientComment): Promise<ClientComment> {
    const [comment] = await db.insert(clientComments).values(insertComment).returning();
    return comment;
  }

  async updateClientComment(id: string, updates: Partial<InsertClientComment>): Promise<ClientComment> {
    const [comment] = await db.update(clientComments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(clientComments.id, id))
      .returning();
    return comment;
  }

  async deleteClientComment(id: string): Promise<void> {
    await db.delete(clientComments).where(eq(clientComments.id, id));
  }

  // API Keys
  async getApiKeys(createdBy?: string): Promise<ApiKey[]> {
    if (createdBy) {
      return await db.select().from(apiKeys).where(eq(apiKeys.createdBy, createdBy)).orderBy(desc(apiKeys.createdAt));
    }
    return await db.select().from(apiKeys).orderBy(desc(apiKeys.createdAt));
  }

  async getApiKey(id: string): Promise<ApiKey | undefined> {
    const [key] = await db.select().from(apiKeys).where(eq(apiKeys.id, id));
    return key || undefined;
  }

  async getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined> {
    const [key] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash));
    return key || undefined;
  }

  async createApiKey(insertKey: InsertApiKey & { keyHash: string; keyPrefix: string }): Promise<ApiKey> {
    const [key] = await db.insert(apiKeys).values(insertKey).returning();
    return key;
  }

  async revokeApiKey(id: string): Promise<ApiKey> {
    const [key] = await db.update(apiKeys)
      .set({ status: 'revoked' })
      .where(eq(apiKeys.id, id))
      .returning();
    return key;
  }

  async updateApiKeyLastUsed(id: string): Promise<void> {
    await db.update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, id));
  }

  // Market Data
  async getMarketData(symbol: string): Promise<MarketData | undefined> {
    const [data] = await db.select().from(marketData).where(eq(marketData.symbol, symbol));
    return data || undefined;
  }

  async updateMarketData(symbol: string, data: Partial<MarketData>): Promise<MarketData> {
    const existing = await this.getMarketData(symbol);
    if (existing) {
      const [updated] = await db.update(marketData).set({ ...data, timestamp: new Date() }).where(eq(marketData.symbol, symbol)).returning();
      return updated;
    } else {
      const [created] = await db.insert(marketData).values({ symbol, ...data, timestamp: new Date() } as any).returning();
      return created;
    }
  }

  // Candles
  async getCandles(symbol: string, interval: string, limit: number = 100): Promise<Candle[]> {
    return await db.select().from(candles)
      .where(and(eq(candles.symbol, symbol), eq(candles.interval, interval)))
      .orderBy(desc(candles.timestamp))
      .limit(limit);
  }

  async saveCandles(candleData: Candle[]): Promise<void> {
    if (candleData.length > 0) {
      await db.insert(candles).values(candleData).onConflictDoNothing();
    }
  }
}

export const storage = new DatabaseStorage();
