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
export const pipelineStatusEnum = pgEnum('pipeline_status', [
  'new_lead', 'contact_attempted', 'in_discussion', 'kyc_pending', 'active_client', 'cold_inactive', 'lost'
]);
export const orderTypeEnum = pgEnum('order_type', ['market', 'limit', 'stop', 'stop_limit']);
export const orderSideEnum = pgEnum('order_side', ['buy', 'sell']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'filled', 'partially_filled', 'cancelled', 'rejected']);
export const positionStatusEnum = pgEnum('position_status', ['open', 'closed']);
export const transactionTypeEnum = pgEnum('transaction_type', ['deposit', 'withdrawal', 'profit', 'loss']);
export const transactionStatusEnum = pgEnum('transaction_status', ['pending', 'completed', 'rejected', 'approved', 'declined', 'cancelled']);
export const transactionMethodEnum = pgEnum('transaction_method', ['bank_transfer', 'credit_card', 'debit_card', 'crypto', 'e_wallet', 'wire_transfer', 'other']);
export const transferStatusEnum = pgEnum('transfer_status', ['pending', 'completed', 'rejected']);
export const auditActionEnum = pgEnum('audit_action', [
  'login', 'logout', 'client_create', 'client_edit', 'client_delete', 'client_ftd_marked', 'client_transferred',
  'trade_create', 'trade_edit', 'trade_close', 'trade_delete', 'balance_adjust',
  'role_create', 'role_edit', 'role_delete', 'permission_change',
  'import', 'export', 'impersonation', 'api_key_create', 'api_key_revoke', 'api_key_use',
  'symbol_create', 'symbol_edit', 'symbol_delete', 'symbol_group_create', 'symbol_group_edit', 'symbol_group_delete',
  'calendar_event_create', 'calendar_event_edit', 'calendar_event_delete',
  'email_template_create', 'email_template_edit', 'email_template_delete', 
  'webhook_received', 'webhook_create', 'webhook_edit', 'webhook_delete', 'webhook_test', 'webhook_delivery',
  'workload_adjusted', 'routing_rule_create', 'routing_rule_edit', 'routing_rule_delete',
  'smart_assignment_toggle', 'smart_assignment_config',
  'robot_create', 'robot_edit', 'robot_delete', 'robot_executed', 'robot_execution_failed', 'robot_paused', 'robot_resumed',
  'document_upload', 'document_view', 'document_download', 'document_delete', 'document_verify'
]);
export const apiKeyStatusEnum = pgEnum('api_key_status', ['active', 'revoked', 'expired']);
export const apiKeyScopeEnum = pgEnum('api_key_scope', ['read', 'write', 'admin']);
export const tradeInitiatorTypeEnum = pgEnum('trade_initiator_type', ['client', 'agent', 'team_leader', 'crm_manager', 'admin', 'robot', 'system']);
export const robotStatusEnum = pgEnum('robot_status', ['active', 'paused', 'stopped']);
export const fundTypeEnum = pgEnum('fund_type', ['real', 'demo', 'bonus']);
export const departmentEnum = pgEnum('department', ['sales', 'retention', 'support']);
export const targetPeriodEnum = pgEnum('target_period', ['daily', 'weekly', 'monthly', 'quarterly']);
export const achievementTypeEnum = pgEnum('achievement_type', ['badge', 'streak', 'milestone', 'level']);
export const documentCategoryEnum = pgEnum('document_category', ['kyc', 'contract', 'compliance', 'statement', 'proof_of_address', 'proof_of_id', 'other']);
export const webhookEventEnum = pgEnum('webhook_event', [
  'client.created', 'client.updated', 'client.deleted', 'client.ftd',
  'position.opened', 'position.updated', 'position.closed',
  'trade.executed', 'deposit.completed', 'withdrawal.completed'
]);
export const webhookStatusEnum = pgEnum('webhook_status', ['active', 'inactive', 'failed']);

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
  currentWorkload: integer("current_workload").notNull().default(0), // Auto-updated count of active clients
  maxWorkload: integer("max_workload").notNull().default(200), // Adjustable by TL/Manager/Admin
  isAvailable: boolean("is_available").notNull().default(true), // Online/offline status
  performanceScore: decimal("performance_score", { precision: 5, scale: 2 }), // Calculated metric
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
  parentTeamId: varchar("parent_team_id").references((): any => teams.id),
  level: text("level").notNull().default('team'), // region, country, team
  leaderId: varchar("leader_id").references(() => users.id),
  commissionSplit: decimal("commission_split", { precision: 5, scale: 2 }),
  languageCode: varchar("language_code", { length: 10 }), // ISO language code: en, de, fr, es, etc.
  department: departmentEnum("department"), // sales, retention, support
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
  statusId: varchar("status_id").references(() => customStatuses.id), // Custom status reference
  nextFollowUpDate: timestamp("next_follow_up_date"),
  assignedAgentId: varchar("assigned_agent_id").references(() => users.id),
  teamId: varchar("team_id").references(() => teams.id),
  hasFTD: boolean("has_ftd").notNull().default(false),
  ftdDate: timestamp("ftd_date"),
  ftdAmount: decimal("ftd_amount", { precision: 18, scale: 2 }),
  ftdFundType: fundTypeEnum("ftd_fund_type"),
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
  balance: decimal("balance", { precision: 18, scale: 2 }).notNull().default('0'), // Total balance (sum of all fund types)
  realBalance: decimal("real_balance", { precision: 18, scale: 2 }).notNull().default('0'),
  demoBalance: decimal("demo_balance", { precision: 18, scale: 2 }).notNull().default('0'),
  bonusBalance: decimal("bonus_balance", { precision: 18, scale: 2 }).notNull().default('0'),
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
  fundType: fundTypeEnum("fund_type").notNull().default('real'), // Track which type of funds: real, demo, or bonus
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  status: transactionStatusEnum("status").notNull().default('pending'),
  method: transactionMethodEnum("method"), // Payment method
  referenceId: text("reference_id"), // External payment reference ID
  notes: text("notes"), // Client notes or description
  reviewNotes: text("review_notes"), // Approver/decliner internal notes
  initiatedBy: varchar("initiated_by").references(() => users.id), // Staff who created the transaction request
  approvedBy: varchar("approved_by").references(() => users.id), // Staff who approved
  approvedAt: timestamp("approved_at"), // When it was approved
  declinedBy: varchar("declined_by").references(() => users.id), // Staff who declined
  declinedAt: timestamp("declined_at"), // When it was declined
  declineReason: text("decline_reason"), // Reason for declining
  processedBy: varchar("processed_by").references(() => users.id), // Legacy field for backward compatibility
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Internal Transfers (Between Subaccounts)
export const internalTransfers = pgTable("internal_transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromSubaccountId: varchar("from_subaccount_id").notNull().references(() => subaccounts.id),
  toSubaccountId: varchar("to_subaccount_id").notNull().references(() => subaccounts.id),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  status: transferStatusEnum("status").notNull().default('pending'),
  notes: text("notes"),
  userId: varchar("user_id").notNull().references(() => users.id), // Staff who initiated transfer
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Symbol Groups (Forex, Crypto, Metals, etc.)
export const symbolGroups = pgTable("symbol_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  defaultSpread: decimal("default_spread", { precision: 10, scale: 5 }),
  defaultLeverage: integer("default_leverage").default(100),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Trading Symbols (Instruments)
export const tradingSymbols = pgTable("trading_symbols", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull().unique(), // e.g., EUR/USD, BTC/USD
  displayName: text("display_name").notNull(),
  category: text("category").notNull(), // forex, crypto, metals, indices, commodities
  symbolGroupId: varchar("symbol_group_id").references(() => symbolGroups.id),
  baseAsset: text("base_asset"), // EUR in EUR/USD
  quoteAsset: text("quote_asset"), // USD in EUR/USD
  contractSize: decimal("contract_size", { precision: 18, scale: 8 }).notNull().default('100000'), // Standard lot size
  minLotSize: decimal("min_lot_size", { precision: 18, scale: 8 }).notNull().default('0.01'),
  maxLotSize: decimal("max_lot_size", { precision: 18, scale: 8 }).notNull().default('100'),
  spreadDefault: decimal("spread_default", { precision: 10, scale: 5 }).notNull(), // in pips
  commissionRate: decimal("commission_rate", { precision: 10, scale: 5 }).notNull().default('0'),
  leverage: integer("leverage").notNull().default(100),
  tradingHours: jsonb("trading_hours").default('[]'), // Array of trading hour objects
  digits: integer("digits").notNull().default(5), // Decimal places for price
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
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
  initiatorType: tradeInitiatorTypeEnum("initiator_type").default('client'),
  initiatorId: varchar("initiator_id"), // User ID if agent/team_leader/admin, robot ID if robot, null if client/system
  leverage: decimal("leverage", { precision: 5, scale: 2 }).default('1'),
  spread: decimal("spread", { precision: 10, scale: 5 }).default('0'),
  fees: decimal("fees", { precision: 18, scale: 2 }).default('0'),
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
  closePrice: decimal("close_price", { precision: 18, scale: 8 }),
  stopLoss: decimal("stop_loss", { precision: 18, scale: 8 }),
  takeProfit: decimal("take_profit", { precision: 18, scale: 8 }),
  unrealizedPnl: decimal("unrealized_pnl", { precision: 18, scale: 2 }).default('0'),
  realizedPnl: decimal("realized_pnl", { precision: 18, scale: 2 }).default('0'),
  commission: decimal("commission", { precision: 18, scale: 2 }).default('0'),
  swap: decimal("swap", { precision: 18, scale: 2 }).default('0'),
  status: positionStatusEnum("status").notNull().default('open'),
  initiatorType: tradeInitiatorTypeEnum("initiator_type").default('client'),
  initiatorId: varchar("initiator_id"), // User ID if agent/team_leader/admin, robot ID if robot, null if client/system
  leverage: decimal("leverage", { precision: 5, scale: 2 }).default('1'),
  spread: decimal("spread", { precision: 10, scale: 5 }).default('0'),
  fees: decimal("fees", { precision: 18, scale: 2 }).default('0'),
  contractMultiplier: decimal("contract_multiplier", { precision: 10, scale: 2 }).default('1'), // Multiplier for indices/CFDs (e.g., S&P500 = 50)
  marginMode: text("margin_mode").default('isolated'), // 'isolated' | 'cross'
  marginUsed: decimal("margin_used", { precision: 18, scale: 2 }).default('0'), // Actual margin used for this position
  notes: text("notes"), // Notes/comments for this position
  openedAt: timestamp("opened_at").notNull().defaultNow(),
  closedAt: timestamp("closed_at"),
});

// Position Tags
export const positionTags = pgTable("position_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  color: varchar("color", { length: 7 }).notNull().default('#3b82f6'), // Hex color code
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Position Tag Assignments (Many-to-Many)
export const positionTagAssignments = pgTable("position_tag_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  positionId: varchar("position_id").notNull().references(() => positions.id, { onDelete: 'cascade' }),
  tagId: varchar("tag_id").notNull().references(() => positionTags.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  positionTagIdx: uniqueIndex("position_tag_idx").on(table.positionId, table.tagId),
}));

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

// Trading Robots
export const tradingRobots = pgTable("trading_robots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  status: robotStatusEnum("status").notNull().default('active'),
  profitRangeMin: decimal("profit_range_min", { precision: 18, scale: 2 }).notNull(), // Min profit per client (e.g., $20)
  profitRangeMax: decimal("profit_range_max", { precision: 18, scale: 2 }).notNull(), // Max profit per client (e.g., $25)
  winRate: decimal("win_rate", { precision: 5, scale: 2 }).default('80'), // Target win rate percentage (default 80%)
  minTradesPerDay: integer("min_trades_per_day").default(10), // Min number of trades to generate
  maxTradesPerDay: integer("max_trades_per_day").default(20), // Max number of trades to generate
  symbols: text("symbols").array().notNull(), // Crypto symbols to trade (e.g., ['BTC/USD', 'ETH/USD'])
  executionTime: text("execution_time").notNull().default('05:00'), // Time to run daily (HH:MM format)
  tradeWindowStart: text("trade_window_start").notNull().default('01:00'), // Historical window start (HH:MM)
  tradeWindowEnd: text("trade_window_end").notNull().default('04:00'), // Historical window end (HH:MM)
  minAccountBalance: decimal("min_account_balance", { precision: 18, scale: 2 }).default('100'), // Min balance required to run
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastRunAt: timestamp("last_run_at"),
});

// Robot-Client Assignments (Junction table)
export const robotClientAssignments = pgTable("robot_client_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  robotId: varchar("robot_id").notNull().references(() => tradingRobots.id),
  accountId: varchar("account_id").notNull().references(() => accounts.id),
  isActive: boolean("is_active").notNull().default(true), // Individual on/off per client
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  robotAccountIdx: uniqueIndex("robot_account_unique_idx").on(table.robotId, table.accountId),
}));

// System Settings (Global Configuration)
export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(), // e.g., 'timezone', 'business_hours', 'maintenance_mode'
  value: text("value").notNull(), // e.g., 'America/New_York', '09:00-17:00', 'false'
  description: text("description"), // Human-readable description of the setting
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

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

// Calendar Events
export const calendarEvents = pgTable("calendar_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  eventType: text("event_type").notNull(), // meeting, call, follow_up, demo, kyc_review
  userId: varchar("user_id").references(() => users.id),
  clientId: varchar("client_id").references(() => clients.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: text("status").notNull().default('scheduled'), // scheduled, completed, cancelled, rescheduled
  location: text("location"), // Physical location or meeting URL
  reminders: jsonb("reminders").default('[]'), // Array of reminder objects {minutes: 30, type: 'email'}
  notes: text("notes"),
  isRecurring: boolean("is_recurring").default(false),
  recurrencePattern: jsonb("recurrence_pattern"), // {frequency: 'daily'|'weekly'|'monthly', interval: 1, daysOfWeek: [0,1,2], endDate: '2025-12-31', count: 10}
  recurrenceExceptions: jsonb("recurrence_exceptions").default('[]'), // Array of date strings to exclude
  parentEventId: varchar("parent_event_id").references((): any => calendarEvents.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Calendar Event Templates
export const calendarEventTemplates = pgTable("calendar_event_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(), // Template name: "Weekly Team Sync", "Client Onboarding Call"
  description: text("description"), // What this template is for
  titleTemplate: text("title_template").notNull(), // Title with optional {{variables}}
  descriptionTemplate: text("description_template"), // Description with optional {{variables}}
  eventType: text("event_type").notNull(), // meeting, call, follow_up, demo, kyc_review
  defaultDuration: integer("default_duration").notNull().default(30), // in minutes
  defaultLocation: text("default_location"), // Default meeting location/URL
  isRecurring: boolean("is_recurring").default(false),
  recurrencePattern: jsonb("recurrence_pattern"), // Default recurrence settings
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Email Templates
export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  subject: text("subject").notNull(),
  body: text("body").notNull(), // HTML content
  category: text("category"), // welcome, verification, follow_up, promotion, kyc, deposit
  variables: jsonb("variables").default('[]'), // Available {{variables}} like {{client_name}}, {{balance}}
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Chat Rooms
export const chatRooms = pgTable("chat_rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // 'internal', 'client_support', 'direct'
  clientId: varchar("client_id").references(() => clients.id),
  participantId: varchar("participant_id").references(() => users.id), // For direct messages  
  name: text("name"),
  createdBy: varchar("created_by").references(() => users.id), // User who created the room
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Chat Messages
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull().references(() => chatRooms.id),
  senderId: varchar("sender_id").notNull(),
  senderType: text("sender_type").notNull(), // 'user', 'client'
  message: text("message").notNull(),
  attachments: jsonb("attachments").default('[]'),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // 'client_assigned', 'ftd_achieved', 'comment_added', 'status_changed', 'balance_adjusted', 'system'
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedClientId: varchar("related_client_id").references(() => clients.id),
  relatedEntity: text("related_entity"), // 'client', 'trade', 'transaction'
  relatedEntityId: varchar("related_entity_id"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Saved Search Filters
export const savedFilters = pgTable("saved_filters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  filters: jsonb("filters").notNull(), // { searchQuery, teamId, agentId, statusId, kycStatus, hasFTD, language, dateFrom, dateTo }
  isDefault: boolean("is_default").notNull().default(false), // Auto-apply on page load
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Affiliate Management
export const affiliates = pgTable("affiliates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull().default('10.00'),
  paymentMethod: text("payment_method"),
  bankDetails: jsonb("bank_details"),
  status: text("status").notNull().default('active'), // active, suspended, inactive
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const affiliateReferrals = pgTable("affiliate_referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  affiliateId: varchar("affiliate_id").notNull().references(() => affiliates.id),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  referralDate: timestamp("referral_date").notNull().defaultNow(),
  status: text("status").notNull().default('pending'), // pending, approved, paid
  commissionAmount: decimal("commission_amount", { precision: 18, scale: 2 }).default('0'),
  commissionPaid: boolean("commission_paid").notNull().default(false),
  notes: text("notes"),
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

// Phase 5: Advanced Configuration

// Custom Statuses
export const customStatuses = pgTable("custom_statuses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  color: text("color").notNull(), // hex color
  icon: text("icon"), // lucide icon name
  category: text("category").notNull(), // sales, retention, kyc, etc.
  allowedTransitions: jsonb("allowed_transitions").default('[]'), // Array of status IDs
  automationTriggers: jsonb("automation_triggers").default('[]'),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// KYC Questions Builder
export const kycQuestions = pgTable("kyc_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  question: text("question").notNull(),
  questionType: text("question_type").notNull(), // text, select, radio, checkbox, file
  options: jsonb("options").default('[]'),
  validation: jsonb("validation").default('{}'), // min, max, pattern, etc.
  conditionalLogic: jsonb("conditional_logic").default('{}'), // Show if...
  isRequired: boolean("is_required").notNull().default(true),
  sortOrder: integer("sort_order").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const kycResponses = pgTable("kyc_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  questionId: varchar("question_id").notNull().references(() => kycQuestions.id),
  response: text("response").notNull(),
  fileUrls: jsonb("file_urls").default('[]'), // For file uploads
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Template Variables
export const templateVariables = pgTable("template_variables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(), // client_name, balance, etc.
  description: text("description"),
  variableType: text("variable_type").notNull(), // system, custom, computed
  dataSource: text("data_source"), // clients.first_name, accounts.balance
  computationLogic: text("computation_logic"), // For computed variables
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Security Settings
export const securitySettings = pgTable("security_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  settingKey: text("setting_key").notNull().unique(),
  settingValue: text("setting_value").notNull(),
  category: text("category").notNull(), // ip_whitelist, session, 2fa, password, other
  description: text("description"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// SMTP Configuration
export const smtpSettings = pgTable("smtp_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  host: text("host").notNull(),
  port: integer("port").notNull().default(587),
  username: text("username").notNull(),
  password: text("password").notNull(),
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name").notNull(),
  useTLS: boolean("use_tls").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Team Routing Rules (Language-based auto-transfer)
export const teamRoutingRules = pgTable("team_routing_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  languageCode: varchar("language_code", { length: 10 }).notNull().unique(), // ISO language code
  salesTeamId: varchar("sales_team_id").references(() => teams.id),
  retentionTeamId: varchar("retention_team_id").references(() => teams.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Smart Assignment Settings
export const smartAssignmentSettings = pgTable("smart_assignment_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  isEnabled: boolean("is_enabled").notNull().default(false), // Disabled by default
  useWorkloadBalance: boolean("use_workload_balance").notNull().default(true),
  useLanguageMatch: boolean("use_language_match").notNull().default(true),
  usePerformanceHistory: boolean("use_performance_history").notNull().default(true),
  useAvailability: boolean("use_availability").notNull().default(true),
  useRoundRobin: boolean("use_round_robin").notNull().default(true),
  teamId: varchar("team_id").references(() => teams.id), // NULL = global settings
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Agent Performance Metrics
export const agentPerformanceMetrics = pgTable("agent_performance_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  teamId: varchar("team_id").references(() => teams.id),
  department: departmentEnum("department"), // sales or retention
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  totalAssignedClients: integer("total_assigned_clients").notNull().default(0),
  ftdConversions: integer("ftd_conversions").notNull().default(0),
  conversionRate: decimal("conversion_rate", { precision: 5, scale: 2 }), // Percentage
  avgResponseTimeMinutes: decimal("avg_response_time_minutes", { precision: 10, scale: 2 }),
  totalCallsMade: integer("total_calls_made").notNull().default(0),
  totalEmailsSent: integer("total_emails_sent").notNull().default(0),
  activeClientsCount: integer("active_clients_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Payment Service Providers
export const paymentProviders = pgTable("payment_providers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  providerType: text("provider_type").notNull(), // stripe, paypal, crypto, bank_transfer
  apiKey: text("api_key"),
  apiSecret: text("api_secret"),
  webhookSecret: text("webhook_secret"),
  webhookUrl: text("webhook_url"),
  configuration: jsonb("configuration").default('{}'),
  isPrimary: boolean("is_primary").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  supportedCurrencies: jsonb("supported_currencies").default('[]'),
  transactionFeePercent: decimal("transaction_fee_percent", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Phase 6: Performance Targets & Gamification

// Performance Targets
export const performanceTargets = pgTable("performance_targets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  targetType: text("target_type").notNull(), // ftd, std, calls, revenue
  period: targetPeriodEnum("period").notNull(),
  targetValue: decimal("target_value", { precision: 18, scale: 2 }).notNull(),
  agentId: varchar("agent_id").references(() => users.id), // Individual target
  teamId: varchar("team_id").references(() => teams.id), // Team target
  department: departmentEnum("department"), // Department-wide target
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  currentValue: decimal("current_value", { precision: 18, scale: 2 }).notNull().default('0'),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Achievements
export const achievements = pgTable("achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  achievementType: achievementTypeEnum("achievement_type").notNull(),
  name: text("name").notNull(), // "First FTD", "5 Day Streak", "Top Performer"
  description: text("description"),
  icon: text("icon"), // lucide icon name
  badgeColor: text("badge_color"), // hex color
  points: integer("points").notNull().default(0),
  metadata: jsonb("metadata").default('{}'), // streak count, milestone value, etc.
  earnedAt: timestamp("earned_at").notNull().defaultNow(),
});

// Documents
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  fileName: text("file_name").notNull(),
  originalFileName: text("original_file_name").notNull(),
  fileType: text("file_type").notNull(), // MIME type
  fileSize: integer("file_size").notNull(), // bytes
  category: documentCategoryEnum("category").notNull(),
  description: text("description"),
  filePath: text("file_path").notNull(), // Storage path
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  isVerified: boolean("is_verified").notNull().default(false),
  verifiedBy: varchar("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  expiryDate: timestamp("expiry_date"), // For documents with expiration
  metadata: jsonb("metadata").default('{}'), // Additional document info
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Webhook Endpoints (Outbound webhooks)
export const webhookEndpoints = pgTable("webhook_endpoints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // Friendly name
  url: text("url").notNull(), // Destination URL
  secret: text("secret").notNull(), // HMAC secret for signature
  events: jsonb("events").notNull().default('[]'), // Array of webhook_event enum values
  status: webhookStatusEnum("status").notNull().default('active'),
  description: text("description"),
  headers: jsonb("headers").default('{}'), // Custom HTTP headers
  retryAttempts: integer("retry_attempts").notNull().default(3),
  retryDelay: integer("retry_delay").notNull().default(60), // seconds
  lastDeliveryAt: timestamp("last_delivery_at"),
  lastDeliveryStatus: text("last_delivery_status"), // 'success' or 'failed'
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Webhook Deliveries (Delivery logs)
export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  endpointId: varchar("endpoint_id").notNull().references(() => webhookEndpoints.id),
  event: webhookEventEnum("event").notNull(),
  payload: jsonb("payload").notNull(), // Full webhook payload
  httpStatus: integer("http_status"), // Response status code
  responseBody: text("response_body"), // Response body (truncated)
  responseTime: integer("response_time"), // milliseconds
  attemptNumber: integer("attempt_number").notNull().default(1),
  success: boolean("success").notNull().default(false),
  errorMessage: text("error_message"),
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
  documents: many(documents),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  client: one(clients, { fields: [documents.clientId], references: [clients.id] }),
  uploadedByUser: one(users, { fields: [documents.uploadedBy], references: [users.id] }),
  verifiedByUser: one(users, { fields: [documents.verifiedBy], references: [users.id] }),
}));

export const webhookEndpointsRelations = relations(webhookEndpoints, ({ one, many }) => ({
  creator: one(users, { fields: [webhookEndpoints.createdBy], references: [users.id] }),
  deliveries: many(webhookDeliveries),
}));

export const webhookDeliveriesRelations = relations(webhookDeliveries, ({ one }) => ({
  endpoint: one(webhookEndpoints, { fields: [webhookDeliveries.endpointId], references: [webhookEndpoints.id] }),
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
  initiator: one(users, { fields: [transactions.initiatedBy], references: [users.id] }),
  approver: one(users, { fields: [transactions.approvedBy], references: [users.id] }),
  decliner: one(users, { fields: [transactions.declinedBy], references: [users.id] }),
  processor: one(users, { fields: [transactions.processedBy], references: [users.id] }),
}));

export const internalTransfersRelations = relations(internalTransfers, ({ one }) => ({
  fromSubaccount: one(subaccounts, { fields: [internalTransfers.fromSubaccountId], references: [subaccounts.id] }),
  toSubaccount: one(subaccounts, { fields: [internalTransfers.toSubaccountId], references: [subaccounts.id] }),
  user: one(users, { fields: [internalTransfers.userId], references: [users.id] }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  account: one(accounts, { fields: [orders.accountId], references: [accounts.id] }),
  subaccount: one(subaccounts, { fields: [orders.subaccountId], references: [subaccounts.id] }),
}));

export const positionsRelations = relations(positions, ({ one, many }) => ({
  account: one(accounts, { fields: [positions.accountId], references: [accounts.id] }),
  subaccount: one(subaccounts, { fields: [positions.subaccountId], references: [subaccounts.id] }),
  order: one(orders, { fields: [positions.orderId], references: [orders.id] }),
  tagAssignments: many(positionTagAssignments),
}));

export const positionTagsRelations = relations(positionTags, ({ many }) => ({
  assignments: many(positionTagAssignments),
}));

export const positionTagAssignmentsRelations = relations(positionTagAssignments, ({ one }) => ({
  position: one(positions, { fields: [positionTagAssignments.positionId], references: [positions.id] }),
  tag: one(positionTags, { fields: [positionTagAssignments.tagId], references: [positionTags.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

export const callLogsRelations = relations(callLogs, ({ one }) => ({
  client: one(clients, { fields: [callLogs.clientId], references: [clients.id] }),
  agent: one(users, { fields: [callLogs.agentId], references: [users.id] }),
}));

export const clientCommentsRelations = relations(clientComments, ({ one }) => ({
  client: one(clients, { fields: [clientComments.clientId], references: [clients.id] }),
  user: one(users, { fields: [clientComments.userId], references: [users.id] }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  creator: one(users, { fields: [apiKeys.createdBy], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
  client: one(clients, { fields: [notifications.relatedClientId], references: [clients.id] }),
}));

export const savedFiltersRelations = relations(savedFilters, ({ one }) => ({
  user: one(users, { fields: [savedFilters.userId], references: [users.id] }),
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

export const insertInternalTransferSchema = createInsertSchema(internalTransfers).omit({
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

export const insertPositionTagSchema = createInsertSchema(positionTags).omit({
  id: true,
  createdAt: true,
});

export const insertPositionTagAssignmentSchema = createInsertSchema(positionTagAssignments).omit({
  id: true,
  createdAt: true,
});

export const modifyPositionSchema = z.object({
  openPrice: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Open price must be a positive number",
  }).optional(),
  closePrice: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Close price must be a positive number",
  }).optional(),
  quantity: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Quantity must be a positive number",
  }).optional(),
  side: z.enum(['buy', 'sell']).optional(),
  unrealizedPnl: z.string().refine((val) => !isNaN(parseFloat(val)), {
    message: "Unrealized P/L must be a valid number",
  }).optional(),
  realizedPnl: z.string().refine((val) => !isNaN(parseFloat(val)), {
    message: "Realized P/L must be a valid number",
  }).optional(),
  openedAt: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Opened date must be a valid date",
  }).optional(),
  closedAt: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Closed date must be a valid date",
  }).optional(),
  stopLoss: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Stop loss must be a positive number",
  }).optional(),
  takeProfit: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Take profit must be a positive number",
  }).optional(),
  commission: z.string().refine((val) => !isNaN(parseFloat(val)), {
    message: "Commission must be a valid number",
  }).optional(),
  notes: z.string().optional(),
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

export const insertTradingRobotSchema = createInsertSchema(tradingRobots).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastRunAt: true,
});

export const insertRobotClientAssignmentSchema = createInsertSchema(robotClientAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
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

export type InternalTransfer = typeof internalTransfers.$inferSelect;
export type InsertInternalTransfer = z.infer<typeof insertInternalTransferSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type Position = typeof positions.$inferSelect;
export type InsertPosition = z.infer<typeof insertPositionSchema>;

export type PositionTag = typeof positionTags.$inferSelect;
export type InsertPositionTag = z.infer<typeof insertPositionTagSchema>;

export type PositionTagAssignment = typeof positionTagAssignments.$inferSelect;
export type InsertPositionTagAssignment = z.infer<typeof insertPositionTagAssignmentSchema>;

export type MarketData = typeof marketData.$inferSelect;

export type Candle = typeof candles.$inferSelect;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type CallLog = typeof callLogs.$inferSelect;
export type InsertCallLog = z.infer<typeof insertCallLogSchema>;

export type ClientComment = typeof clientComments.$inferSelect;
export type InsertClientComment = z.infer<typeof insertClientCommentSchema>;

export type TradingRobot = typeof tradingRobots.$inferSelect;
export type InsertTradingRobot = z.infer<typeof insertTradingRobotSchema>;

export type RobotClientAssignment = typeof robotClientAssignments.$inferSelect;
export type InsertRobotClientAssignment = z.infer<typeof insertRobotClientAssignmentSchema>;

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  keyHash: true,
  keyPrefix: true,
  createdAt: true,
  lastUsedAt: true,
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;

export const insertSymbolGroupSchema = createInsertSchema(symbolGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SymbolGroup = typeof symbolGroups.$inferSelect;
export type InsertSymbolGroup = z.infer<typeof insertSymbolGroupSchema>;

export const insertTradingSymbolSchema = createInsertSchema(tradingSymbols).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type TradingSymbol = typeof tradingSymbols.$inferSelect;
export type InsertTradingSymbol = z.infer<typeof insertTradingSymbolSchema>;

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;

export const insertCalendarEventTemplateSchema = createInsertSchema(calendarEventTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).refine(
  (data) => {
    if (data.isRecurring && !data.recurrenceFrequency) {
      return false;
    }
    return true;
  },
  {
    message: "Recurrence frequency is required for recurring templates",
    path: ["recurrenceFrequency"],
  }
);

export type CalendarEventTemplate = typeof calendarEventTemplates.$inferSelect;
export type InsertCalendarEventTemplate = z.infer<typeof insertCalendarEventTemplateSchema>;

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;

export const insertAffiliateSchema = createInsertSchema(affiliates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Affiliate = typeof affiliates.$inferSelect;
export type InsertAffiliate = z.infer<typeof insertAffiliateSchema>;

export const insertAffiliateReferralSchema = createInsertSchema(affiliateReferrals).omit({
  id: true,
  createdAt: true,
});

export type AffiliateReferral = typeof affiliateReferrals.$inferSelect;
export type InsertAffiliateReferral = z.infer<typeof insertAffiliateReferralSchema>;

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export const insertSavedFilterSchema = createInsertSchema(savedFilters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SavedFilter = typeof savedFilters.$inferSelect;
export type InsertSavedFilter = z.infer<typeof insertSavedFilterSchema>;

// Phase 5: Advanced Configuration Schemas
export const insertCustomStatusSchema = createInsertSchema(customStatuses).omit({
  id: true,
  createdAt: true,
});

export type CustomStatus = typeof customStatuses.$inferSelect;
export type InsertCustomStatus = z.infer<typeof insertCustomStatusSchema>;

export const insertKycQuestionSchema = createInsertSchema(kycQuestions).omit({
  id: true,
  createdAt: true,
});

export type KycQuestion = typeof kycQuestions.$inferSelect;
export type InsertKycQuestion = z.infer<typeof insertKycQuestionSchema>;

export const insertKycResponseSchema = createInsertSchema(kycResponses).omit({
  id: true,
  createdAt: true,
});

export type KycResponse = typeof kycResponses.$inferSelect;
export type InsertKycResponse = z.infer<typeof insertKycResponseSchema>;

export const insertTemplateVariableSchema = createInsertSchema(templateVariables).omit({
  id: true,
  createdAt: true,
});

export type TemplateVariable = typeof templateVariables.$inferSelect;
export type InsertTemplateVariable = z.infer<typeof insertTemplateVariableSchema>;

export const insertSecuritySettingSchema = createInsertSchema(securitySettings).omit({
  id: true,
  updatedAt: true,
});

export type SecuritySetting = typeof securitySettings.$inferSelect;
export type InsertSecuritySetting = z.infer<typeof insertSecuritySettingSchema>;

export const insertSmtpSettingSchema = createInsertSchema(smtpSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SmtpSetting = typeof smtpSettings.$inferSelect;
export type InsertSmtpSetting = z.infer<typeof insertSmtpSettingSchema>;

export const insertPaymentProviderSchema = createInsertSchema(paymentProviders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PaymentProvider = typeof paymentProviders.$inferSelect;
export type InsertPaymentProvider = z.infer<typeof insertPaymentProviderSchema>;

// Phase 6: Performance Targets & Gamification Schemas
export const insertPerformanceTargetSchema = createInsertSchema(performanceTargets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export type PerformanceTarget = typeof performanceTargets.$inferSelect;
export type InsertPerformanceTarget = z.infer<typeof insertPerformanceTargetSchema>;

export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
  earnedAt: true,
});

export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;

// Document schemas
export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

// Webhook schemas
export const insertWebhookEndpointSchema = createInsertSchema(webhookEndpoints).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastDeliveryAt: true,
  lastDeliveryStatus: true,
});

export type WebhookEndpoint = typeof webhookEndpoints.$inferSelect;
export type InsertWebhookEndpoint = z.infer<typeof insertWebhookEndpointSchema>;

export const insertWebhookDeliverySchema = createInsertSchema(webhookDeliveries).omit({
  id: true,
  createdAt: true,
});

export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type InsertWebhookDelivery = z.infer<typeof insertWebhookDeliverySchema>;

// Team Routing Rules schemas
export const insertTeamRoutingRuleSchema = createInsertSchema(teamRoutingRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type TeamRoutingRule = typeof teamRoutingRules.$inferSelect;
export type InsertTeamRoutingRule = z.infer<typeof insertTeamRoutingRuleSchema>;

// Smart Assignment Settings schemas
export const insertSmartAssignmentSettingSchema = createInsertSchema(smartAssignmentSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SmartAssignmentSetting = typeof smartAssignmentSettings.$inferSelect;
export type InsertSmartAssignmentSetting = z.infer<typeof insertSmartAssignmentSettingSchema>;

// Agent Performance Metrics schemas
export const insertAgentPerformanceMetricSchema = createInsertSchema(agentPerformanceMetrics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type AgentPerformanceMetric = typeof agentPerformanceMetrics.$inferSelect;
export type InsertAgentPerformanceMetric = z.infer<typeof insertAgentPerformanceMetricSchema>;

// Mark FTD schema
export const markFTDSchema = z.object({
  amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Amount must be a positive number",
  }),
  fundType: z.enum(['real', 'demo', 'bonus']),
  notes: z.string().optional(),
});

// Permission constants
export const PERMISSIONS = {
  // Client permissions
  CLIENT_VIEW: 'client.view',
  CLIENT_VIEW_ALL: 'client.view_all',
  CLIENT_VIEW_SALES: 'client.view_sales',
  CLIENT_VIEW_RETENTION: 'client.view_retention',
  CLIENT_CREATE: 'client.create',
  CLIENT_EDIT: 'client.edit',
  CLIENT_DELETE: 'client.delete',
  CLIENT_VIEW_PII: 'client.view_pii', // View unmasked email/phone
  CLIENT_MARK_FTD: 'client.mark_ftd',
  
  // Trading permissions
  TRADE_VIEW: 'trade.view',
  TRADE_VIEW_ALL: 'trade.view_all',
  TRADE_CREATE: 'trade.create',
  TRADE_EDIT: 'trade.edit',
  TRADE_CLOSE: 'trade.close',
  
  // Symbol permissions
  SYMBOL_VIEW: 'symbol.view',
  SYMBOL_MANAGE: 'symbol.manage',
  
  // Calendar permissions
  CALENDAR_VIEW: 'calendar.view',
  CALENDAR_MANAGE: 'calendar.manage',
  
  // Email template permissions
  EMAIL_TEMPLATE_VIEW: 'email_template.view',
  EMAIL_TEMPLATE_MANAGE: 'email_template.manage',
  
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
  
  // Document Management
  DOCUMENT_VIEW: 'document.view',
  DOCUMENT_UPLOAD: 'document.upload',
  DOCUMENT_DOWNLOAD: 'document.download',
  DOCUMENT_DELETE: 'document.delete',
  DOCUMENT_VERIFY: 'document.verify',
  
  // Webhook Management (Outbound)
  WEBHOOK_VIEW: 'webhook.view',
  WEBHOOK_CREATE: 'webhook.create',
  WEBHOOK_EDIT: 'webhook.edit',
  WEBHOOK_DELETE: 'webhook.delete',
  WEBHOOK_TEST: 'webhook.test',
} as const;
