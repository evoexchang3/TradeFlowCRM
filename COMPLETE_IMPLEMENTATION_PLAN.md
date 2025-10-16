# 🚀 COMPLETE CRM IMPLEMENTATION PLAN
**All Phases: From LSP Fixes to 100% Feature Complete**

---

## 🎯 PHASE 0: CRITICAL FIXES (30 minutes)

**Status:** Ready to start  
**Priority:** 🔴 CRITICAL  
**Must complete before proceeding to other phases**

### Tasks:
1. ✅ Fix `apiRequest()` signature in trading-symbols.tsx
   - Update all mutation calls (create, update, delete)
   - Change from passing options object to using proper fetch API pattern

2. ✅ Fix `apiRequest()` signature in trading-symbol-groups.tsx
   - Update all mutation calls (create, update, delete)
   - Match the correct API pattern

3. ✅ Fix type incompatibilities
   - `description: string | null` → handle null properly in form defaults
   - `category: string` → use proper enum type

4. ✅ Test all Phase 2 forms
   - Create new symbol → verify success
   - Edit existing symbol → verify updates
   - Delete symbol → verify removal
   - Same for symbol groups

5. ✅ Architect review of fixes

---

## 🎯 PHASE 3: COMMUNICATION & SCHEDULING (10-14 hours)

**Status:** 40% complete (backend exists)  
**Priority:** 🟠 HIGH  
**Business Impact:** Critical for client engagement

### 3.1 Calendar Frontend (3-4 hours)

**Database:** ✅ Already exists (`calendar_events`)  
**Backend API:** ✅ Already exists

**Tasks:**
1. Create `/calendar` page component
   - Day/Week/Month view toggle
   - Event list view
   - Integration with existing API

2. Build event creation dialog
   - Form with all fields (title, description, type, dates)
   - Client selection dropdown
   - User/agent assignment
   - Reminder configuration (JSON array)

3. Implement event management
   - Edit event dialog
   - Delete with confirmation
   - Mark as completed/cancelled
   - Status badges

4. Add calendar features
   - Team calendar visibility (role-based)
   - Filter by event type
   - Filter by assigned agent
   - Filter by client

5. Export functionality
   - iCal export button
   - Download individual events
   - Download all events

**Files to Create:**
- `client/src/pages/calendar.tsx`
- `client/src/components/calendar/` (optional sub-components)

**Routes to Add:**
- Add to `App.tsx`: `<Route path="/calendar" component={Calendar} />`
- Add to sidebar with Calendar icon

---

### 3.2 Email Templates Frontend (2-3 hours)

**Database:** ✅ Already exists (`email_templates`)  
**Backend API:** ✅ Already exists

**Tasks:**
1. Create `/configuration/email-templates` page
   - DataTable with template list
   - Search and filter by category
   - Active/inactive status indicators

2. Build template editor dialog
   - Rich text editor (TipTap or similar)
   - Subject line input
   - Category dropdown
   - Active status toggle

3. Implement variable system
   - Variable insertion buttons ({{client_name}}, {{balance}}, etc.)
   - Variable autocomplete
   - Variable reference list

4. Add preview functionality
   - Preview modal with sample data
   - Variable substitution preview
   - HTML rendering

5. Test email feature
   - Send test email dialog
   - Email input field
   - Success/error toast notifications

**Files to Create:**
- `client/src/pages/email-templates.tsx`
- Install rich text editor: `npm install @tiptap/react @tiptap/starter-kit`

**Routes to Add:**
- Add to `App.tsx`: `<Route path="/configuration/email-templates" />`
- Add to sidebar under Configuration section

---

### 3.3 Chat System (5-7 hours)

**Database:** ❌ Need to create tables  
**Backend API:** ❌ Need to create  
**WebSocket:** ⚠️ Market data WS exists, need chat WS

**Tasks:**

#### Database Schema (30 min)
1. Add to `shared/schema.ts`:
```typescript
export const chatRooms = pgTable("chat_rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // 'internal', 'client_support'
  clientId: varchar("client_id").references(() => clients.id),
  name: text("name"),
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

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
```

2. Push schema: `npm run db:push`

#### Backend API (2-3 hours)
1. Add to `server/routes.ts`:
   - `GET /api/chat/rooms` - List all rooms for current user
   - `POST /api/chat/rooms` - Create new room (internal or client)
   - `GET /api/chat/rooms/:id/messages` - Get room messages
   - `POST /api/chat/rooms/:id/messages` - Send message
   - `PATCH /api/chat/messages/:id/read` - Mark as read
   - `POST /api/chat/upload` - File upload endpoint

2. WebSocket chat endpoint:
   - Add to `server/index.ts`
   - Subscribe to room: `{ type: 'subscribe', roomId: 'xxx' }`
   - Send message: `{ type: 'message', roomId: 'xxx', message: 'text' }`
   - Broadcast to room members

#### Frontend (2-3 hours)
1. Create `/chat` page
   - Room list sidebar
   - Message area
   - Input field with emoji picker
   - File upload button

2. Real-time features
   - WebSocket hook for live messages
   - Typing indicators
   - Read receipts
   - Message status (sent/delivered/read)

3. Advanced features
   - @mention autocomplete
   - File attachments with preview
   - Internal team channels
   - Client support threads

**Files to Create:**
- `client/src/pages/chat.tsx`
- `client/src/hooks/use-chat-ws.ts`
- `server/websocket/chat.ts`

---

### 3.4 VOIP Integration (4-5 hours)

**Database:** ✅ `call_logs` table exists (not currently used)  
**Integration:** ❌ Need Twilio setup

**Tasks:**

#### Twilio Setup (1 hour)
1. Search for Twilio integration:
   - Use `search_integrations` tool
   - Check for Replit Twilio integration
   - Or manually configure with credentials

2. Configure environment variables:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`

#### Backend API (1-2 hours)
1. Add to `server/routes.ts`:
   - `POST /api/voip/call` - Initiate call to client
   - `POST /api/voip/webhook` - Twilio status callback
   - `GET /api/voip/calls` - List call history
   - `GET /api/clients/:id/calls` - Get client call history

2. Implement Twilio service:
   - Outbound call initiation
   - Call status tracking
   - Recording URL storage
   - Log to `call_logs` table

#### Frontend (2 hours)
1. Add click-to-call buttons
   - In client detail page
   - In client list (action column)
   - Call icon with phone number display

2. Call history UI
   - Add tab to client detail page
   - Show call logs table
   - Play recording button
   - Call duration, status, notes

3. Call analytics dashboard
   - Create `/reports/calls` page
   - Total calls, duration, by agent
   - Call success rate
   - Average call duration

**Files to Create:**
- `server/services/twilio.ts`
- Update `client/src/pages/client-detail.tsx`
- `client/src/pages/call-analytics.tsx` (optional)

---

## 🎯 PHASE 4: REPORTS & ANALYTICS (10-13 hours)

**Status:** 33% complete  
**Priority:** 🟡 MEDIUM  
**Business Impact:** Data-driven decision making

### 4.1 Enhanced Sales Dashboard (2-3 hours)

**Current State:** Basic sales dashboard exists  
**Goal:** Add all missing metrics and visualizations

**Tasks:**
1. Add missing metrics to backend
   - Update `/api/reports/sales-dashboard` endpoint
   - Add conversion funnel data
   - Add time series data (daily/weekly/monthly)
   - Add geographic distribution data

2. Enhance frontend visualizations
   - Install chart library: `npm install recharts`
   - Conversion funnel chart
   - Time series line/bar charts
   - Agent performance comparison table
   - Geographic distribution map (optional)

3. Add filters and date ranges
   - Date range picker
   - Team filter
   - Agent filter
   - Refresh button

**Files to Update:**
- `server/routes.ts` - Enhance sales dashboard endpoint
- `client/src/pages/sales-dashboard.tsx` - Add charts

---

### 4.2 Affiliate Dashboard (5-6 hours)

**Database:** ❌ Need to create tables  
**Backend:** ❌ Need to create  
**Frontend:** ❌ Need to create

**Tasks:**

#### Database Schema (30 min)
1. Add to `shared/schema.ts`:
```typescript
export const affiliates = pgTable("affiliates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull(),
  paymentMethod: text("payment_method"),
  bankDetails: jsonb("bank_details"),
  status: text("status").notNull().default('active'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const affiliateReferrals = pgTable("affiliate_referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  affiliateId: varchar("affiliate_id").notNull().references(() => affiliates.id),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  commissionEarned: decimal("commission_earned", { precision: 18, scale: 2 }),
  status: text("status").notNull().default('pending'), // pending, approved, paid
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

2. Push schema: `npm run db:push`

#### Backend API (2 hours)
1. Affiliate management endpoints:
   - `GET /api/affiliates` - List all affiliates
   - `POST /api/affiliates` - Create affiliate
   - `PATCH /api/affiliates/:id` - Update affiliate
   - `DELETE /api/affiliates/:id` - Delete affiliate

2. Referral tracking:
   - `GET /api/affiliates/:id/referrals` - Get referrals
   - `POST /api/affiliates/:id/referrals` - Manual referral assignment
   - `GET /api/affiliates/:id/commissions` - Commission summary

3. Payout management:
   - `GET /api/affiliates/:id/payouts` - Payout history
   - `POST /api/affiliates/:id/payout` - Mark commission as paid
   - `GET /api/reports/affiliate-payouts` - All pending payouts

4. Public referral tracking:
   - Capture referral code in client registration
   - Auto-create referral record on FTD
   - Calculate commission based on rate

#### Frontend (2-3 hours)
1. Create affiliate management page `/configuration/affiliates`
   - DataTable with affiliate list
   - Add/Edit/Delete dialogs
   - Commission rate configuration

2. Create affiliate dashboard `/reports/affiliate-dashboard`
   - Top affiliates leaderboard
   - Total referrals and commissions
   - Pending payouts table
   - Commission charts over time

3. Referral tracking
   - Show referral source in client detail
   - Link to affiliate from client page
   - Show all referrals for an affiliate

**Files to Create:**
- `client/src/pages/affiliates.tsx`
- `client/src/pages/affiliate-dashboard.tsx`

---

### 4.3 Client Activity Reports (3-4 hours)

**Database:** ❌ Need activity tracking  
**Current State:** Only have audit logs

**Tasks:**

#### Database Schema (30 min)
1. Add to `shared/schema.ts`:
```typescript
export const clientActivity = pgTable("client_activity", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  activityType: text("activity_type").notNull(), // login, page_view, deposit, trade, withdrawal
  page: text("page"), // For page views
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const clientEngagementScore = pgTable("client_engagement_score", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id).unique(),
  score: integer("score").notNull().default(0), // 0-100
  lastLoginAt: timestamp("last_login_at"),
  loginCount: integer("login_count").notNull().default(0),
  tradeCount: integer("trade_count").notNull().default(0),
  depositCount: integer("deposit_count").notNull().default(0),
  lastActivityAt: timestamp("last_activity_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

2. Push schema: `npm run db:push`

#### Backend API (1 hour)
1. Activity tracking:
   - `POST /api/activity/track` - Track activity (called from frontend)
   - `GET /api/clients/:id/activity` - Get client activity log
   - Middleware to auto-track page views

2. Engagement scoring:
   - `GET /api/clients/:id/engagement` - Get engagement score
   - Background job to calculate scores
   - `GET /api/reports/inactive-clients` - Clients inactive > X days

#### Frontend (1-2 hours)
1. Create activity reports page `/reports/activity`
   - Client activity table with filters
   - Engagement score display
   - Inactive client alerts
   - Activity timeline view

2. Add activity tracking hooks
   - Track page views automatically
   - Track important actions
   - Login/logout tracking

3. Engagement indicators
   - Show score in client list
   - Color-coded engagement badges
   - Activity heatmap (optional)

**Files to Create:**
- `client/src/pages/client-activity.tsx`
- `client/src/hooks/use-activity-tracker.ts`

---

## 🎯 PHASE 5: ADVANCED CONFIGURATION (10-14 hours)

**Status:** Not started  
**Priority:** 🟡 MEDIUM  
**Business Impact:** Enterprise features

### 5.1 Organizational Hierarchy (2-3 hours)

**Goal:** Multi-level org structure beyond basic teams

**Tasks:**

#### Database Schema (30 min)
1. Update `teams` table in `shared/schema.ts`:
```typescript
export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  parentTeamId: varchar("parent_team_id").references(() => teams.id), // NEW
  level: text("level").notNull(), // region, country, team
  leaderId: varchar("leader_id").references(() => users.id),
  commissionSplit: decimal("commission_split", { precision: 5, scale: 2 }), // NEW
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

2. Push schema: `npm run db:push`

#### Backend API (1 hour)
1. Hierarchy endpoints:
   - `GET /api/hierarchy/tree` - Get full org tree
   - `GET /api/teams/:id/children` - Get child teams
   - `GET /api/teams/:id/rollup` - Performance rollup

#### Frontend (1 hour)
1. Create hierarchy page `/configuration/hierarchy`
   - Tree visualization (use react-d3-tree or similar)
   - Drag-and-drop team reorganization
   - Commission split configuration
   - Performance rollup view

**Files to Create:**
- `client/src/pages/hierarchy.tsx`
- Install: `npm install react-d3-tree`

---

### 5.2 Custom Statuses (2-3 hours)

**Goal:** Define custom client statuses beyond defaults

**Tasks:**

#### Database Schema (30 min)
1. Add to `shared/schema.ts`:
```typescript
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
```

2. Push schema

#### Backend API (1 hour)
1. Status management:
   - CRUD endpoints for custom statuses
   - Status transition validation
   - Automation trigger execution

#### Frontend (1 hour)
1. Create `/configuration/statuses` page
   - Status list with color/icon preview
   - Add/Edit dialog with color picker
   - Icon selector
   - Transition rules builder
   - Drag-and-drop sorting

**Files to Create:**
- `client/src/pages/custom-statuses.tsx`

---

### 5.3 KYC Questions Builder (2-3 hours)

**Tasks:**

#### Database Schema (30 min)
1. Add to `shared/schema.ts`:
```typescript
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
```

#### Frontend (2 hours)
1. Create `/configuration/kyc-questions` page
   - Question builder with drag-and-drop
   - Question type selector
   - Conditional logic builder
   - Preview mode

**Files to Create:**
- `client/src/pages/kyc-questions.tsx`

---

### 5.4 Template Variables (1-2 hours)

**Goal:** System and custom variables for email/SMS templates

**Tasks:**

#### Database Schema (30 min)
1. Add to `shared/schema.ts`:
```typescript
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
```

#### Frontend (1 hour)
1. Create `/configuration/variables` page
   - Variable list with usage examples
   - Add custom variable dialog
   - Test variable substitution
   - Variable documentation

**Files to Create:**
- `client/src/pages/template-variables.tsx`

---

### 5.5 Security Settings (2-3 hours)

**Goal:** Enterprise security features

**Tasks:**

#### Database Schema (30 min)
1. Add to `shared/schema.ts`:
```typescript
export const securitySettings = pgTable("security_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  require2FA: boolean("require_2fa").notNull().default(false),
  ipWhitelist: jsonb("ip_whitelist").default('[]'),
  sessionTimeout: integer("session_timeout").notNull().default(3600), // seconds
  passwordMinLength: integer("password_min_length").notNull().default(8),
  passwordRequireSpecial: boolean("password_require_special").notNull().default(true),
  maxLoginAttempts: integer("max_login_attempts").notNull().default(5),
  lockoutDuration: integer("lockout_duration").notNull().default(900), // seconds
  auditLogRetention: integer("audit_log_retention").notNull().default(90), // days
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const user2FA = pgTable("user_2fa", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  secret: text("secret").notNull(),
  backupCodes: jsonb("backup_codes").default('[]'),
  isEnabled: boolean("is_enabled").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

#### Backend (1 hour)
1. Implement 2FA with speakeasy/otplib
2. IP whitelist middleware
3. Login attempt tracking
4. Session management

#### Frontend (1 hour)
1. Create `/configuration/security` page
   - Security settings form
   - 2FA enable/disable toggle
   - IP whitelist management
   - Password policy configuration

**Files to Create:**
- `client/src/pages/security-settings.tsx`
- Install: `npm install speakeasy qrcode`

---

### 5.6 Multi-Currency Support (2-3 hours)

**Tasks:**

#### Database Schema (30 min)
1. Add to `shared/schema.ts`:
```typescript
export const currencies = pgTable("currencies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(), // USD, EUR, GBP
  name: text("name").notNull(),
  symbol: text("symbol").notNull(), // $, €, £
  exchangeRate: decimal("exchange_rate", { precision: 18, scale: 8 }).notNull(),
  isBaseCurrency: boolean("is_base_currency").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

#### Backend (1 hour)
1. Exchange rate API integration
2. Auto-update rates (cron job)
3. Currency conversion endpoints

#### Frontend (1 hour)
1. Create `/configuration/currencies` page
   - Currency list with rates
   - Update rates button
   - Set base currency
   - Currency converter tool

**Files to Create:**
- `client/src/pages/currencies.tsx`

---

## 🎯 PHASE 6: PAYMENT INTEGRATION (8-12 hours)

**Status:** Not started  
**Priority:** 🟢 LOW  
**Business Impact:** Automation

### 6.1 SMTP Configuration (2-3 hours)

**Tasks:**
1. Create `/configuration/smtp` page
2. SMTP server configuration form
3. Test email sending
4. Email queue management
5. Bounce handling

**Files to Create:**
- `client/src/pages/smtp-config.tsx`
- Install: `npm install nodemailer`

---

### 6.2 Primary PSP Integration (3-5 hours)

**Tasks:**
1. Search for payment integrations (Stripe/PayPal)
2. Configure PSP credentials
3. Deposit/withdrawal automation
4. Transaction webhooks
5. KYC/AML checks

**Files to Create:**
- `client/src/pages/psp-config.tsx`
- `server/services/payment.ts`

---

### 6.3 Multi-PSP Support (3-4 hours)

**Tasks:**
1. Support multiple payment processors
2. Smart routing logic
3. Fallback configuration
4. Fee comparison

**Files to Create:**
- `client/src/pages/multi-psp.tsx`

---

## 📋 EXECUTION CHECKLIST

### Before Starting Each Phase:
- [ ] Read phase requirements
- [ ] Check dependencies are installed
- [ ] Review database schema changes
- [ ] Backup if needed

### During Phase Execution:
- [ ] Create database tables first
- [ ] Run `npm run db:push`
- [ ] Implement backend API
- [ ] Test with Postman/curl
- [ ] Build frontend UI
- [ ] Test functionality
- [ ] Fix any bugs

### After Completing Each Phase:
- [ ] Call architect for review
- [ ] Run LSP check
- [ ] Test all features
- [ ] Update documentation
- [ ] Mark phase complete

---

## 🚀 ESTIMATED TIMELINE

| Phase | Hours | Days (8h/day) |
|-------|-------|---------------|
| Phase 0: LSP Fixes | 0.5 | 0.1 |
| Phase 3: Communication | 10-14 | 1.5-2 |
| Phase 4: Reports | 10-13 | 1.5-2 |
| Phase 5: Advanced Config | 10-14 | 1.5-2 |
| Phase 6: Payments | 8-12 | 1-1.5 |
| **TOTAL** | **38-53** | **5-7** |

---

## 💡 SUCCESS CRITERIA

**Phase 3 Complete When:**
- ✅ Calendar UI working with events
- ✅ Email templates manageable
- ✅ Chat system operational
- ✅ VOIP calls functional

**Phase 4 Complete When:**
- ✅ Enhanced sales dashboard with charts
- ✅ Affiliate system tracking referrals
- ✅ Activity reports showing engagement

**Phase 5 Complete When:**
- ✅ Hierarchy visualization working
- ✅ Custom statuses operational
- ✅ KYC builder functional
- ✅ 2FA enabled
- ✅ Multi-currency support

**Phase 6 Complete When:**
- ✅ SMTP sending emails
- ✅ PSP processing payments
- ✅ Multi-PSP routing working

---

## 🎯 NEXT STEPS

1. **Review this plan**
2. **Approve to proceed**
3. **Start Phase 0** (LSP fixes - 30 min)
4. **Continue sequentially** through phases
5. **Architect review** after each phase

**Ready to begin Phase 0?** 🚀
