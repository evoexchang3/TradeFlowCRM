import { sql, relations } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  timestamp, 
  integer, 
  decimal, 
  boolean, 
  jsonb,
  pgEnum,
  uniqueIndex
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const kycStatusEnum = pgEnum('kyc_status', ['pending', 'verified', 'rejected']);
export const clientStatusEnum = pgEnum('client_status', [
  'new', 'reassigned', 'potential', 'low_potential', 'mid_potential', 'high_potential',
  'no_answer', 'voicemail', 'callback_requested', 'not_interested', 'converted', 'lost'
]);
export const orderTypeEnum = pgEnum('order_type', ['market', 'limit', 'stop', 'stop_limit']);
export const orderSideEnum = pgEnum('order_side', ['buy', 'sell']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'filled', 'partially_filled', 'cancelled', 'rejected']);
export const positionStatusEnum = pgEnum('position_status', ['open', 'closed']);
export const transactionTypeEnum = pgEnum('transaction_type', ['deposit', 'withdrawal']);
export const transactionStatusEnum = pgEnum('transaction_status', ['pending', 'completed', 'rejected']);
export const auditActionEnum = pgEnum('audit_action', [
  'login', 'logout', 'client_create', 'client_edit', 'client_delete',
  'trade_create', 'trade_edit', 'trade_close', 'balance_adjust',
  'role_create', 'role_edit', 'role_delete', 'permission_change',
  'import', 'export', 'impersonation', 'api_key_create', 'api_key_revoke', 'api_key_use'
]);
export const apiKeyStatusEnum = pgEnum('api_key_status', ['active', 'revoked', 'expired']);
export const apiKeyScopeEnum = pgEnum('api_key_scope', ['read', 'write', 'admin']);

// Users (Admin/Agent/Team Leader)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  roleId: varchar("role_id").references(() => roles.id),
  teamId: varchar("team_id").references(() => teams.id),
  isActive: boolean("is_active").notNull().default(true),
  mustResetPassword: boolean("must_reset_password").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Roles
export const roles = pgTable("roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  permissions: jsonb("permissions").notNull().default('[]'), // Array of permission strings
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Teams
export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  leaderId: varchar("leader_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Clients
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  country: text("country"),
  dateOfBirth: timestamp("date_of_birth"),
  kycStatus: kycStatusEnum("kyc_status").notNull().default('pending'),
  kycDocuments: jsonb("kyc_documents").default('[]'), // Array of document URLs
  status: clientStatusEnum("status").notNull().default('new'),
  assignedAgentId: varchar("assigned_agent_id").references(() => users.id),
  teamId: varchar("team_id").references(() => teams.id),
  mustResetPassword: boolean("must_reset_password").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Client Accounts
export const accounts = pgTable("accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  accountNumber: text("account_number").notNull().unique(),
  currency: text("currency").notNull().default('USD'),
  balance: decimal("balance", { precision: 18, scale: 2 }).notNull().default('0'),
  equity: decimal("equity", { precision: 18, scale: 2 }).notNull().default('0'),
  margin: decimal("margin", { precision: 18, scale: 2 }).notNull().default('0'),
  freeMargin: decimal("free_margin", { precision: 18, scale: 2 }).notNull().default('0'),
  marginLevel: decimal("margin_level", { precision: 8, scale: 2 }).default('0'),
  leverage: integer("leverage").notNull().default(100),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Subaccounts (Multiple trading accounts per client)
export const subaccounts = pgTable("subaccounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => accounts.id),
  name: text("name").notNull(), // e.g., "Main", "Scalping", "Long-term"
  currency: text("currency").notNull().default('USD'),
  balance: decimal("balance", { precision: 18, scale: 2 }).notNull().default('0'),
  equity: decimal("equity", { precision: 18, scale: 2 }).notNull().default('0'),
  margin: decimal("margin", { precision: 18, scale: 2 }).notNull().default('0'),
  freeMargin: decimal("free_margin", { precision: 18, scale: 2 }).notNull().default('0'),
  marginLevel: decimal("margin_level", { precision: 8, scale: 2 }).default('0'),
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Transactions (Deposits/Withdrawals)
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => accounts.id),
  type: transactionTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  status: transactionStatusEnum("status").notNull().default('pending'),
  method: text("method"), // e.g., bank_transfer, credit_card
  notes: text("notes"),
  processedBy: varchar("processed_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Orders
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => accounts.id),
  subaccountId: varchar("subaccount_id").references(() => subaccounts.id), // Optional: for subaccount-level trading
  symbol: text("symbol").notNull(), // e.g., EUR/USD, BTC/USD
  type: orderTypeEnum("type").notNull(),
  side: orderSideEnum("side").notNull(),
  quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
  price: decimal("price", { precision: 18, scale: 8 }), // For limit/stop orders
  stopLoss: decimal("stop_loss", { precision: 18, scale: 8 }),
  takeProfit: decimal("take_profit", { precision: 18, scale: 8 }),
  status: orderStatusEnum("status").notNull().default('pending'),
  filledQuantity: decimal("filled_quantity", { precision: 18, scale: 8 }).default('0'),
  avgFillPrice: decimal("avg_fill_price", { precision: 18, scale: 8 }),
  commission: decimal("commission", { precision: 18, scale: 2 }).default('0'),
  swap: decimal("swap", { precision: 18, scale: 2 }).default('0'),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  filledAt: timestamp("filled_at"),
  cancelledAt: timestamp("cancelled_at"),
});

// Positions
export const positions = pgTable("positions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => accounts.id),
  subaccountId: varchar("subaccount_id").references(() => subaccounts.id), // Optional: for subaccount-level trading
  orderId: varchar("order_id").references(() => orders.id),
  symbol: text("symbol").notNull(),
  side: orderSideEnum("side").notNull(),
  quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
  openPrice: decimal("open_price", { precision: 18, scale: 8 }).notNull(),
  currentPrice: decimal("current_price", { precision: 18, scale: 8 }),
  stopLoss: decimal("stop_loss", { precision: 18, scale: 8 }),
  takeProfit: decimal("take_profit", { precision: 18, scale: 8 }),
  unrealizedPnl: decimal("unrealized_pnl", { precision: 18, scale: 2 }).default('0'),
  realizedPnl: decimal("realized_pnl", { precision: 18, scale: 2 }).default('0'),
  commission: decimal("commission", { precision: 18, scale: 2 }).default('0'),
  swap: decimal("swap", { precision: 18, scale: 2 }).default('0'),
  status: positionStatusEnum("status").notNull().default('open'),
  openedAt: timestamp("opened_at").notNull().defaultNow(),
  closedAt: timestamp("closed_at"),
});

// Market Data Cache
export const marketData = pgTable("market_data", {
  symbol: text("symbol").primaryKey(),
  bid: decimal("bid", { precision: 18, scale: 8 }),
  ask: decimal("ask", { precision: 18, scale: 8 }),
  lastPrice: decimal("last_price", { precision: 18, scale: 8 }),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// Historical Candles Cache
export const candles = pgTable("candles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull(),
  interval: text("interval").notNull(), // 1m, 5m, 15m, 1h, 4h, 1d
  open: decimal("open", { precision: 18, scale: 8 }).notNull(),
  high: decimal("high", { precision: 18, scale: 8 }).notNull(),
  low: decimal("low", { precision: 18, scale: 8 }).notNull(),
  close: decimal("close", { precision: 18, scale: 8 }).notNull(),
  volume: decimal("volume", { precision: 18, scale: 8 }),
  timestamp: timestamp("timestamp").notNull(),
}, (table) => ({
  symbolIntervalIdx: uniqueIndex("symbol_interval_time_idx").on(table.symbol, table.interval, table.timestamp),
}));

// Audit Logs
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  action: auditActionEnum("action").notNull(),
  targetType: text("target_type"), // 'client', 'trade', 'role', etc.
  targetId: varchar("target_id"),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Call Logs
export const callLogs = pgTable("call_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  duration: integer("duration"), // in seconds
  status: text("status"), // completed, failed, missed
  recordingUrl: text("recording_url"),
  twilioCallSid: text("twilio_call_sid"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Client Comments
export const clientComments = pgTable("client_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// API Keys for external platform integration
export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // Friendly name for the API key
  keyHash: text("key_hash").notNull().unique(), // Hashed API key for security
  keyPrefix: text("key_prefix").notNull(), // First 8 chars for display (e.g., "sk_live_")
  scope: apiKeyScopeEnum("scope").notNull().default('read'),
  ipWhitelist: text("ip_whitelist").array(), // Array of allowed IPs
  createdBy: varchar("created_by").notNull().references(() => users.id),
  status: apiKeyStatusEnum("status").notNull().default('active'),
  expiresAt: timestamp("expires_at"), // Optional expiration
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, { fields: [users.roleId], references: [roles.id] }),
  team: one(teams, { fields: [users.teamId], references: [teams.id] }),
  auditLogs: many(auditLogs),
  apiKeys: many(apiKeys),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  leader: one(users, { fields: [teams.leaderId], references: [users.id] }),
  members: many(users),
  clients: many(clients),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  assignedAgent: one(users, { fields: [clients.assignedAgentId], references: [users.id] }),
  team: one(teams, { fields: [clients.teamId], references: [teams.id] }),
  accounts: many(accounts),
  callLogs: many(callLogs),
  comments: many(clientComments),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  client: one(clients, { fields: [accounts.clientId], references: [clients.id] }),
  subaccounts: many(subaccounts),
  transactions: many(transactions),
  orders: many(orders),
  positions: many(positions),
}));

export const subaccountsRelations = relations(subaccounts, ({ one, many }) => ({
  account: one(accounts, { fields: [subaccounts.accountId], references: [accounts.id] }),
  orders: many(orders),
  positions: many(positions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  account: one(accounts, { fields: [transactions.accountId], references: [accounts.id] }),
  processor: one(users, { fields: [transactions.processedBy], references: [users.id] }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  account: one(accounts, { fields: [orders.accountId], references: [accounts.id] }),
  subaccount: one(subaccounts, { fields: [orders.subaccountId], references: [subaccounts.id] }),
}));

export const positionsRelations = relations(positions, ({ one }) => ({
  account: one(accounts, { fields: [positions.accountId], references: [accounts.id] }),
  subaccount: one(subaccounts, { fields: [positions.subaccountId], references: [subaccounts.id] }),
  order: one(orders, { fields: [positions.orderId], references: [orders.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

export const callLogsRelations = relations(callLogs, ({ one }) => ({
  client: one(clients, { fields: [callLogs.clientId], references: [callLogs.id] }),
  agent: one(users, { fields: [callLogs.agentId], references: [users.id] }),
}));

export const clientCommentsRelations = relations(clientComments, ({ one }) => ({
  client: one(clients, { fields: [clientComments.clientId], references: [clients.id] }),
  user: one(users, { fields: [clientComments.userId], references: [users.id] }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  creator: one(users, { fields: [apiKeys.createdBy], references: [users.id] }),
}));

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  createdAt: true,
});

export const insertSubaccountSchema = createInsertSchema(subaccounts).omit({
  id: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
});

export const insertPositionSchema = createInsertSchema(positions).omit({
  id: true,
  openedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertCallLogSchema = createInsertSchema(callLogs).omit({
  id: true,
  createdAt: true,
});

export const insertClientCommentSchema = createInsertSchema(clientComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;

export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;

export type Subaccount = typeof subaccounts.$inferSelect;
export type InsertSubaccount = z.infer<typeof insertSubaccountSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type Position = typeof positions.$inferSelect;
export type InsertPosition = z.infer<typeof insertPositionSchema>;

export type MarketData = typeof marketData.$inferSelect;

export type Candle = typeof candles.$inferSelect;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type CallLog = typeof callLogs.$inferSelect;
export type InsertCallLog = z.infer<typeof insertCallLogSchema>;

export type ClientComment = typeof clientComments.$inferSelect;
export type InsertClientComment = z.infer<typeof insertClientCommentSchema>;

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  keyHash: true,
  keyPrefix: true,
  createdAt: true,
  lastUsedAt: true,
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;

// Permission constants
export const PERMISSIONS = {
  // Client permissions
  CLIENT_VIEW: 'client.view',
  CLIENT_VIEW_ALL: 'client.view_all',
  CLIENT_CREATE: 'client.create',
  CLIENT_EDIT: 'client.edit',
  CLIENT_DELETE: 'client.delete',
  CLIENT_VIEW_PII: 'client.view_pii', // View unmasked email/phone
  
  // Trading permissions
  TRADE_VIEW: 'trade.view',
  TRADE_CREATE: 'trade.create',
  TRADE_EDIT: 'trade.edit',
  TRADE_CLOSE: 'trade.close',
  
  // Balance permissions
  BALANCE_VIEW: 'balance.view',
  BALANCE_ADJUST: 'balance.adjust',
  
  // Role permissions
  ROLE_VIEW: 'role.view',
  ROLE_CREATE: 'role.create',
  ROLE_EDIT: 'role.edit',
  ROLE_DELETE: 'role.delete',
  
  // Team permissions
  TEAM_VIEW: 'team.view',
  TEAM_MANAGE: 'team.manage',
  
  // Import/Export
  DATA_IMPORT: 'data.import',
  DATA_EXPORT: 'data.export',
  
  // Impersonation
  CLIENT_IMPERSONATE: 'client.impersonate',
  
  // Audit
  AUDIT_VIEW: 'audit.view',
  
  // Call
  CLIENT_CALL: 'client.call',
  
  // API Key Management
  API_KEY_VIEW: 'api_key.view',
  API_KEY_CREATE: 'api_key.create',
  API_KEY_REVOKE: 'api_key.revoke',
} as const;
