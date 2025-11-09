// Referenced from blueprint:javascript_database - adapted for trading platform CRM
import { db } from "./db";
import { eq, and, desc, sql, gte, lte, or, inArray } from "drizzle-orm";

interface PerformanceTargetFilters {
  agentId?: string;
  teamId?: string;
  department?: string;
  period?: string;
  isActive?: boolean;
  startDate?: Date;
  endDate?: Date;
}
import {
  users, clients, accounts, subaccounts, transactions, internalTransfers, orders, positions, positionTags, positionTagAssignments, roles, teams, auditLogs, callLogs, clientComments, marketData, candles, apiKeys, tradingRobots, robotClientAssignments, systemSettings, smtpSettings, emailTemplates, documents, webhookEndpoints, webhookDeliveries, performanceTargets, achievements,
  type User, type InsertUser,
  type Client, type InsertClient,
  type Account, type InsertAccount,
  type Subaccount, type InsertSubaccount,
  type Transaction, type InsertTransaction,
  type Order, type InsertOrder,
  type Position, type InsertPosition,
  type PositionTag, type InsertPositionTag,
  type PositionTagAssignment, type InsertPositionTagAssignment,
  type Role, type InsertRole,
  type Team, type InsertTeam,
  type AuditLog, type InsertAuditLog,
  type CallLog, type InsertCallLog,
  type ClientComment, type InsertClientComment,
  type ApiKey, type InsertApiKey,
  type InternalTransfer, type InsertInternalTransfer,
  type MarketData,
  type Candle,
  type TradingRobot, type InsertTradingRobot,
  type RobotClientAssignment, type InsertRobotClientAssignment,
  type SystemSetting, type InsertSystemSetting,
  type SmtpSetting,
  type EmailTemplate,
  type Document, type InsertDocument,
  type WebhookEndpoint, type InsertWebhookEndpoint,
  type WebhookDelivery, type InsertWebhookDelivery,
  type PerformanceTarget, type InsertPerformanceTarget,
  type Achievement, type InsertAchievement,
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
  getAccounts(): Promise<Account[]>;
  getAccountByClientId(clientId: string): Promise<Account | undefined>;
  getAccountsByClientId(clientId: string): Promise<Account[]>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: string, updates: Partial<InsertAccount>): Promise<Account>;
  
  // Subaccounts
  getSubaccount(id: string): Promise<Subaccount | undefined>;
  getSubaccountsByAccountId(accountId: string): Promise<Subaccount[]>;
  createSubaccount(subaccount: InsertSubaccount): Promise<Subaccount>;
  updateSubaccount(id: string, updates: Partial<InsertSubaccount>): Promise<Subaccount>;
  
  // Transactions
  getTransactions(filters?: any): Promise<Transaction[]>;
  getTransaction(id: string): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: string, updates: Partial<InsertTransaction>): Promise<Transaction>;
  approveTransaction(id: string, approvedBy: string, reviewNotes?: string): Promise<Transaction>;
  declineTransaction(id: string, declinedBy: string, declineReason: string, reviewNotes?: string): Promise<Transaction>;
  
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
  
  // Position Tags
  getPositionTags(): Promise<PositionTag[]>;
  getPositionTag(id: string): Promise<PositionTag | undefined>;
  createPositionTag(tag: InsertPositionTag): Promise<PositionTag>;
  updatePositionTag(id: string, updates: Partial<InsertPositionTag>): Promise<PositionTag>;
  deletePositionTag(id: string): Promise<void>;
  getPositionTagAssignments(positionId: string): Promise<PositionTagAssignment[]>;
  assignTagToPosition(positionId: string, tagId: string): Promise<PositionTagAssignment>;
  removeTagFromPosition(positionId: string, tagId: string): Promise<void>;
  
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
  
  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  
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
  
  // Trading Robots
  getRobots(): Promise<TradingRobot[]>;
  getRobot(id: string): Promise<TradingRobot | undefined>;
  createRobot(robot: InsertTradingRobot): Promise<TradingRobot>;
  updateRobot(id: string, updates: Partial<InsertTradingRobot>): Promise<TradingRobot>;
  deleteRobot(id: string): Promise<void>;
  
  // Robot Client Assignments
  getRobotAssignments(robotId: string): Promise<RobotClientAssignment[]>;
  getAccountRobotAssignments(accountId: string): Promise<RobotClientAssignment[]>;
  assignRobotToAccounts(robotId: string, accountIds: string[]): Promise<RobotClientAssignment[]>;
  unassignRobotFromAccount(robotId: string, accountId: string): Promise<void>;
  toggleRobotAssignment(assignmentId: string, isActive: boolean): Promise<RobotClientAssignment>;
  upsertRobotClientAssignment(assignment: InsertRobotClientAssignment): Promise<RobotClientAssignment>;
  
  // System Settings
  getSystemSetting(key: string): Promise<SystemSetting | undefined>;
  getAllSystemSettings(): Promise<SystemSetting[]>;
  updateSystemSetting(key: string, value: string, updatedBy?: string): Promise<SystemSetting>;
  
  // SMTP Settings
  getSmtpSettings(): Promise<SmtpSetting[]>;
  
  // Email Templates
  getEmailTemplates(): Promise<EmailTemplate[]>;
  
  // Documents
  getDocuments(clientId: string): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: string, updates: Partial<InsertDocument>): Promise<Document>;
  deleteDocument(id: string): Promise<void>;
  verifyDocument(id: string, verifiedBy: string): Promise<Document>;
  
  // Webhook Endpoints (Outbound)
  getWebhookEndpoints(): Promise<WebhookEndpoint[]>;
  getWebhookEndpoint(id: string): Promise<WebhookEndpoint | undefined>;
  createWebhookEndpoint(endpoint: InsertWebhookEndpoint): Promise<WebhookEndpoint>;
  updateWebhookEndpoint(id: string, updates: Partial<Omit<WebhookEndpoint, 'id' | 'createdAt' | 'updatedAt'>>): Promise<WebhookEndpoint>;
  deleteWebhookEndpoint(id: string): Promise<void>;
  
  // Webhook Deliveries
  getWebhookDeliveries(endpointId?: string): Promise<WebhookDelivery[]>;
  createWebhookDelivery(delivery: InsertWebhookDelivery): Promise<WebhookDelivery>;
  
  // Performance Targets
  getPerformanceTargets(filters?: PerformanceTargetFilters): Promise<PerformanceTarget[]>;
  getPerformanceTarget(id: string): Promise<PerformanceTarget | undefined>;
  createPerformanceTarget(target: InsertPerformanceTarget): Promise<PerformanceTarget>;
  updatePerformanceTarget(id: string, updates: Partial<InsertPerformanceTarget>): Promise<PerformanceTarget>;
  deletePerformanceTarget(id: string): Promise<void>;
  updateTargetProgress(id: string, incrementValue: number): Promise<PerformanceTarget>;
  
  // Achievements
  getAchievements(agentId?: string): Promise<Achievement[]>;
  getAchievement(id: string): Promise<Achievement | undefined>;
  createAchievement(achievement: InsertAchievement): Promise<Achievement>;
  deleteAchievement(id: string): Promise<void>;
  
  // Permissions
  hasPermission(userId: string, permission: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  public db = db;

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

  async getAccounts(): Promise<Account[]> {
    return await db.select().from(accounts).orderBy(desc(accounts.createdAt));
  }

  async getAccountByClientId(clientId: string): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.clientId, clientId));
    return account || undefined;
  }

  async getAccountsByClientId(clientId: string): Promise<Account[]> {
    return await db.select().from(accounts).where(eq(accounts.clientId, clientId));
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
    const conditions = [];
    
    if (filters?.clientId) {
      const clientAccounts = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(eq(accounts.clientId, filters.clientId));
      
      const accountIds = clientAccounts.map(a => a.id);
      if (accountIds.length === 0) {
        return [];
      }
      conditions.push(inArray(transactions.accountId, accountIds));
    } else if (filters?.accountId) {
      conditions.push(eq(transactions.accountId, filters.accountId));
    }
    
    if (filters?.type) {
      conditions.push(eq(transactions.type, filters.type));
    }
    if (filters?.status) {
      conditions.push(eq(transactions.status, filters.status));
    }
    
    let query = db.select().from(transactions);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(transactions.createdAt));
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return transaction;
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db.insert(transactions).values(insertTransaction).returning();
    return transaction;
  }

  async updateTransaction(id: string, updates: Partial<InsertTransaction>): Promise<Transaction> {
    const [transaction] = await db.update(transactions).set(updates).where(eq(transactions.id, id)).returning();
    return transaction;
  }

  async approveTransaction(id: string, approvedBy: string, reviewNotes?: string): Promise<Transaction> {
    const transaction = await this.getTransaction(id);
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    if (transaction.status !== 'pending') {
      throw new Error('Only pending transactions can be approved');
    }

    // For withdrawals, check sufficient funds before approval
    if (transaction.type === 'withdrawal') {
      const account = await this.getAccount(transaction.accountId);
      if (account) {
        const balanceField = transaction.fundType === 'real' ? 'realBalance' : 
                           transaction.fundType === 'demo' ? 'demoBalance' : 'bonusBalance';
        const currentBalance = parseFloat(account[balanceField] as string);
        const withdrawalAmount = parseFloat(transaction.amount);
        
        if (currentBalance < withdrawalAmount) {
          throw new Error(`Insufficient ${transaction.fundType} balance for withdrawal. Available: ${currentBalance}, Requested: ${withdrawalAmount}`);
        }
      }
    }

    const updates: Partial<InsertTransaction> = {
      status: 'approved',
      approvedBy,
      approvedAt: new Date(),
      reviewNotes: reviewNotes || transaction.reviewNotes,
    };

    // Atomic update: only update if status is still 'pending' to prevent race conditions
    const [updated] = await db.update(transactions)
      .set(updates)
      .where(and(eq(transactions.id, id), eq(transactions.status, 'pending')))
      .returning();
    
    if (!updated) {
      throw new Error('Transaction is no longer pending or has already been processed');
    }
    
    // Update account balance based on transaction type
    const account = await this.getAccount(transaction.accountId);
    if (account) {
      const balanceField = transaction.fundType === 'real' ? 'realBalance' : 
                         transaction.fundType === 'demo' ? 'demoBalance' : 'bonusBalance';
      const currentBalance = parseFloat(account[balanceField] as string);
      const amount = parseFloat(transaction.amount);
      
      // Deposits add to balance, withdrawals subtract from balance
      const newBalance = transaction.type === 'deposit' 
        ? currentBalance + amount 
        : currentBalance - amount;
      
      const totalBalanceChange = transaction.type === 'deposit' ? amount : -amount;
      
      await this.updateAccount(account.id, {
        [balanceField]: newBalance.toString(),
        balance: (parseFloat(account.balance) + totalBalanceChange).toString(),
      });
    }

    return updated;
  }

  async declineTransaction(id: string, declinedBy: string, declineReason: string, reviewNotes?: string): Promise<Transaction> {
    const transaction = await this.getTransaction(id);
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    if (transaction.status !== 'pending') {
      throw new Error('Only pending transactions can be declined');
    }

    const updates: Partial<InsertTransaction> = {
      status: 'declined',
      declinedBy,
      declinedAt: new Date(),
      declineReason,
      reviewNotes: reviewNotes || transaction.reviewNotes,
    };

    // Atomic update: only update if status is still 'pending' to prevent race conditions
    const [updated] = await db.update(transactions)
      .set(updates)
      .where(and(eq(transactions.id, id), eq(transactions.status, 'pending')))
      .returning();
    
    if (!updated) {
      throw new Error('Transaction is no longer pending or has already been processed');
    }
    
    return updated;
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
    const conditions = [];
    
    if (filters?.accountId) {
      conditions.push(eq(positions.accountId, filters.accountId));
    }
    if (filters?.status) {
      conditions.push(eq(positions.status, filters.status));
    }
    
    let query = db.select().from(positions);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(positions.openedAt));
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

  async deletePosition(id: string): Promise<void> {
    await db.delete(positions).where(eq(positions.id, id));
  }

  // Position Tags
  async getPositionTags(): Promise<PositionTag[]> {
    return await db.select().from(positionTags).orderBy(desc(positionTags.createdAt));
  }

  async getPositionTag(id: string): Promise<PositionTag | undefined> {
    const [tag] = await db.select().from(positionTags).where(eq(positionTags.id, id));
    return tag || undefined;
  }

  async createPositionTag(insertTag: InsertPositionTag): Promise<PositionTag> {
    const [tag] = await db.insert(positionTags).values(insertTag).returning();
    return tag;
  }

  async updatePositionTag(id: string, updates: Partial<InsertPositionTag>): Promise<PositionTag> {
    const [tag] = await db.update(positionTags).set(updates).where(eq(positionTags.id, id)).returning();
    return tag;
  }

  async deletePositionTag(id: string): Promise<void> {
    await db.delete(positionTags).where(eq(positionTags.id, id));
  }

  async getPositionTagAssignments(positionId: string): Promise<PositionTagAssignment[]> {
    return await db.select().from(positionTagAssignments).where(eq(positionTagAssignments.positionId, positionId));
  }

  async assignTagToPosition(positionId: string, tagId: string): Promise<PositionTagAssignment> {
    const [assignment] = await db.insert(positionTagAssignments).values({ positionId, tagId }).returning();
    return assignment;
  }

  async removeTagFromPosition(positionId: string, tagId: string): Promise<void> {
    await db.delete(positionTagAssignments).where(
      and(
        eq(positionTagAssignments.positionId, positionId),
        eq(positionTagAssignments.tagId, tagId)
      )
    );
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

  // Notifications
  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(insertNotification).returning();
    return notification;
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

  // Trading Robots
  async getRobots(): Promise<TradingRobot[]> {
    return await db.select().from(tradingRobots).orderBy(desc(tradingRobots.createdAt));
  }

  async getRobot(id: string): Promise<TradingRobot | undefined> {
    const [robot] = await db.select().from(tradingRobots).where(eq(tradingRobots.id, id));
    return robot || undefined;
  }

  async createRobot(insertRobot: InsertTradingRobot): Promise<TradingRobot> {
    const [robot] = await db.insert(tradingRobots).values(insertRobot).returning();
    return robot;
  }

  async updateRobot(id: string, updates: Partial<InsertTradingRobot>): Promise<TradingRobot> {
    const [robot] = await db.update(tradingRobots)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tradingRobots.id, id))
      .returning();
    return robot;
  }

  async deleteRobot(id: string): Promise<void> {
    await db.delete(tradingRobots).where(eq(tradingRobots.id, id));
  }

  // Robot Client Assignments
  async getRobotAssignments(robotId: string): Promise<RobotClientAssignment[]> {
    return await db.select()
      .from(robotClientAssignments)
      .where(eq(robotClientAssignments.robotId, robotId))
      .orderBy(desc(robotClientAssignments.createdAt));
  }

  async getAccountRobotAssignments(accountId: string): Promise<RobotClientAssignment[]> {
    return await db.select()
      .from(robotClientAssignments)
      .where(eq(robotClientAssignments.accountId, accountId))
      .orderBy(desc(robotClientAssignments.createdAt));
  }

  async assignRobotToAccounts(robotId: string, accountIds: string[]): Promise<RobotClientAssignment[]> {
    const assignments = accountIds.map(accountId => ({
      robotId,
      accountId,
      isActive: true,
    }));
    
    if (assignments.length === 0) {
      return [];
    }
    
    // Use onConflictDoUpdate to handle existing assignments
    return await db.insert(robotClientAssignments)
      .values(assignments)
      .onConflictDoUpdate({
        target: [robotClientAssignments.robotId, robotClientAssignments.accountId],
        set: {
          isActive: true,
          updatedAt: new Date(),
        },
      })
      .returning();
  }

  async unassignRobotFromAccount(robotId: string, accountId: string): Promise<void> {
    await db.delete(robotClientAssignments)
      .where(and(
        eq(robotClientAssignments.robotId, robotId),
        eq(robotClientAssignments.accountId, accountId)
      ));
  }

  async toggleRobotAssignment(assignmentId: string, isActive: boolean): Promise<RobotClientAssignment> {
    const [assignment] = await db.update(robotClientAssignments)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(robotClientAssignments.id, assignmentId))
      .returning();
    return assignment;
  }

  async upsertRobotClientAssignment(assignment: InsertRobotClientAssignment): Promise<RobotClientAssignment> {
    const [result] = await db.insert(robotClientAssignments)
      .values(assignment)
      .onConflictDoUpdate({
        target: [robotClientAssignments.robotId, robotClientAssignments.accountId],
        set: {
          isActive: assignment.isActive ?? true,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  // System Settings
  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
    return setting || undefined;
  }

  async getAllSystemSettings(): Promise<SystemSetting[]> {
    return await db.select().from(systemSettings).orderBy(systemSettings.key);
  }

  async updateSystemSetting(key: string, value: string, updatedBy?: string): Promise<SystemSetting> {
    // Upsert: insert if not exists, update if exists
    const [setting] = await db.insert(systemSettings)
      .values({ key, value, updatedBy, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value, updatedBy, updatedAt: new Date() }
      })
      .returning();
    return setting;
  }
  
  // SMTP Settings
  async getSmtpSettings(): Promise<SmtpSetting[]> {
    return await db.select().from(smtpSettings).orderBy(desc(smtpSettings.createdAt));
  }
  
  // Email Templates
  async getEmailTemplates(): Promise<EmailTemplate[]> {
    return await db.select().from(emailTemplates).orderBy(emailTemplates.name);
  }
  
  // Documents
  async getDocuments(clientId: string): Promise<Document[]> {
    return await db.select().from(documents)
      .where(eq(documents.clientId, clientId))
      .orderBy(desc(documents.createdAt));
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document || undefined;
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const [document] = await db.insert(documents).values(insertDocument).returning();
    return document;
  }

  async updateDocument(id: string, updates: Partial<InsertDocument>): Promise<Document> {
    const [document] = await db.update(documents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    return document;
  }

  async deleteDocument(id: string): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  async verifyDocument(id: string, verifiedBy: string): Promise<Document> {
    const [document] = await db.update(documents)
      .set({ 
        isVerified: true, 
        verifiedBy, 
        verifiedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(documents.id, id))
      .returning();
    return document;
  }
  
  // Webhook Endpoints (Outbound)
  async getWebhookEndpoints(): Promise<WebhookEndpoint[]> {
    return await db.select().from(webhookEndpoints).orderBy(desc(webhookEndpoints.createdAt));
  }
  
  async getWebhookEndpoint(id: string): Promise<WebhookEndpoint | undefined> {
    const [endpoint] = await db.select().from(webhookEndpoints).where(eq(webhookEndpoints.id, id));
    return endpoint;
  }
  
  async createWebhookEndpoint(endpoint: InsertWebhookEndpoint): Promise<WebhookEndpoint> {
    const [created] = await db.insert(webhookEndpoints).values(endpoint).returning();
    return created;
  }
  
  async updateWebhookEndpoint(id: string, updates: Partial<Omit<WebhookEndpoint, 'id' | 'createdAt' | 'updatedAt'>>): Promise<WebhookEndpoint> {
    const [updated] = await db.update(webhookEndpoints)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(webhookEndpoints.id, id))
      .returning();
    return updated;
  }
  
  async deleteWebhookEndpoint(id: string): Promise<void> {
    await db.delete(webhookEndpoints).where(eq(webhookEndpoints.id, id));
  }
  
  // Webhook Deliveries
  async getWebhookDeliveries(endpointId?: string): Promise<WebhookDelivery[]> {
    if (endpointId) {
      return await db.select().from(webhookDeliveries)
        .where(eq(webhookDeliveries.endpointId, endpointId))
        .orderBy(desc(webhookDeliveries.createdAt))
        .limit(100);
    }
    return await db.select().from(webhookDeliveries)
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(100);
  }
  
  async createWebhookDelivery(delivery: InsertWebhookDelivery): Promise<WebhookDelivery> {
    const [created] = await db.insert(webhookDeliveries).values(delivery).returning();
    return created;
  }
  
  // Performance Targets
  async getPerformanceTargets(filters?: PerformanceTargetFilters): Promise<PerformanceTarget[]> {
    let query = db.select().from(performanceTargets);
    
    const conditions = [];
    
    if (filters) {
      if (filters.agentId) conditions.push(eq(performanceTargets.agentId, filters.agentId));
      if (filters.teamId) conditions.push(eq(performanceTargets.teamId, filters.teamId));
      if (filters.department) conditions.push(eq(performanceTargets.department, filters.department));
      if (filters.period) conditions.push(eq(performanceTargets.period, filters.period));
      if (filters.isActive !== undefined) conditions.push(eq(performanceTargets.isActive, filters.isActive));
      if (filters.startDate) conditions.push(gte(performanceTargets.endDate, filters.startDate));
      if (filters.endDate) conditions.push(lte(performanceTargets.startDate, filters.endDate));
    }
    
    if (!filters || filters.isActive === undefined) {
      conditions.push(eq(performanceTargets.isActive, true));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(performanceTargets.createdAt));
  }
  
  async getPerformanceTarget(id: string): Promise<PerformanceTarget | undefined> {
    const [target] = await db.select().from(performanceTargets).where(eq(performanceTargets.id, id));
    return target || undefined;
  }
  
  async createPerformanceTarget(insertTarget: InsertPerformanceTarget): Promise<PerformanceTarget> {
    const [target] = await db.insert(performanceTargets).values(insertTarget).returning();
    return target;
  }
  
  async updatePerformanceTarget(id: string, updates: Partial<InsertPerformanceTarget>): Promise<PerformanceTarget> {
    const [target] = await db.update(performanceTargets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(performanceTargets.id, id))
      .returning();
    return target;
  }
  
  async deletePerformanceTarget(id: string): Promise<void> {
    await db.update(performanceTargets)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(performanceTargets.id, id));
  }
  
  async updateTargetProgress(id: string, incrementValue: number): Promise<PerformanceTarget> {
    const [target] = await db.update(performanceTargets)
      .set({
        currentValue: sql`${performanceTargets.currentValue} + ${incrementValue}`,
        updatedAt: new Date()
      })
      .where(eq(performanceTargets.id, id))
      .returning();
    return target;
  }
  
  // Achievements
  async getAchievements(agentId?: string): Promise<Achievement[]> {
    if (agentId) {
      return await db.select().from(achievements)
        .where(eq(achievements.agentId, agentId))
        .orderBy(desc(achievements.earnedAt));
    }
    return await db.select().from(achievements).orderBy(desc(achievements.earnedAt));
  }
  
  async getAchievement(id: string): Promise<Achievement | undefined> {
    const [achievement] = await db.select().from(achievements).where(eq(achievements.id, id));
    return achievement || undefined;
  }
  
  async createAchievement(insertAchievement: InsertAchievement): Promise<Achievement> {
    const [achievement] = await db.insert(achievements).values(insertAchievement).returning();
    return achievement;
  }
  
  async deleteAchievement(id: string): Promise<void> {
    await db.delete(achievements).where(eq(achievements.id, id));
  }
  
  // Permissions
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user || !user.roleId) {
      return false;
    }
    
    const [role] = await db.select().from(roles).where(eq(roles.id, user.roleId));
    if (!role) {
      return false;
    }
    
    // Admin role has all permissions
    if (role.name?.toLowerCase() === 'administrator') {
      return true;
    }
    
    const permissions = (role.permissions as string[]) || [];
    return permissions.includes(permission);
  }
}

export const storage = new DatabaseStorage();
