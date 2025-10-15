# Trading Platform CRM

## Overview

This enterprise-grade CRM system for a trading platform manages clients, accounts, and trading operations. It features an in-house trading engine with real-time market data, comprehensive client management, role-based access control, and audit logging. Designed as a customizable template, it can be tailored for various partners and brokers, supporting easy replication and export. The business vision is to provide a robust, scalable, and secure platform that streamlines trading operations and client relationship management for financial institutions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript (Vite).
**UI Components**: Shadcn UI (Radix UI primitives) with an enterprise, data-focused design inspired by Carbon Design System.
**State Management**: TanStack Query for server state; React Context for authentication; React hooks for local state.
**Styling**: Tailwind CSS with custom design tokens, supporting dark (primary) and light modes.
**Routing**: Wouter for client-side routing.
**Key Design Principles**: Emphasizes data clarity, a professional aesthetic for high-stakes environments, minimal cognitive load, and consistent patterns.

### Backend Architecture

**Runtime**: Node.js with Express.js.
**Database**: PostgreSQL via Neon serverless with connection pooling.
**ORM**: Drizzle ORM for type-safe operations.
**API Design**: RESTful API with WebSocket support for real-time market data.
**Authentication**: JWT-based authentication with bcrypt for password hashing and token-based authorization.

**Key Modules**:

1.  **Trading Engine**: Handles various order types, position management, real-time P/L calculations, automatic Stop Loss/Take Profit, margin management, and order lifecycle.
2.  **Market Data Service**: Integrates with Twelve Data for WebSocket streaming of live quotes and REST API for historical candle data with caching.
3.  **Client Management**: Supports manual and API-based client creation, bulk import, public registration with email verification, KYC tracking, account balance/equity management, and trading activity history.
4.  **Authorization System**: Dynamic role-based access control with custom role creation, granular permissions, team-based organization, and permission groups.
5.  **Audit System**: Comprehensive logging of all user actions, impersonation, and import/export operations.

### Data Schema

**Core Entities**: Users, Clients, Accounts, Subaccounts, Orders, Positions, Transactions, Roles & Permissions, Teams, Audit Logs, API Keys, Market Data.
**Key Relationships**: Clients to Accounts (1:1), Clients to Agents/Teams, Accounts to Subaccounts (1:N), Subaccounts to Orders/Positions (1:N), Users to Roles/Teams. All modifications are tracked in Audit Logs.

## External Dependencies

**Market Data Provider**:
-   **Twelve Data**: Primary source for forex, crypto, metals, commodities. Uses WebSocket API for real-time streaming and REST API for historical data.

**Database**:
-   **Neon PostgreSQL**: Serverless database solution.

**UI Component Libraries**:
-   **Radix UI**: Primitives for accessible components.
-   **Shadcn UI**: Component collection.
-   **Lucide React**: Icons.

**Development Tools**:
-   **TypeScript**: For type safety.
-   **Drizzle Kit**: For database migrations.
-   **Zod**: For runtime validation.
-   **React Hook Form**: For form management.

**Authentication**:
-   **jsonwebtoken**: For JWT token generation/verification.
-   **bcrypt**: For password hashing.

## Integration Status

### Trading Platform Integration (COMPLETE ✅)

The CRM is fully integrated with the Trading Platform via three secure communication channels:

**Integration-5a: Webhook Receiver**
- POST /api/webhooks/site with HMAC-SHA256 signature verification
- Handles 5 event types: client.registered, deposit.completed, withdrawal.completed, kyc.updated, account.updated
- Automatic client/account creation and balance updates
- Comprehensive audit logging

**Integration-5b: Service API**
- 5 protected endpoints with Bearer token authentication
- GET /api/service/clients/:email - Get client info
- GET /api/service/accounts/:clientEmail - Get account + subaccounts
- PATCH /api/service/clients/:email/kyc - Update KYC status
- POST /api/service/clients/:email/notes - Add client note
- GET /api/service/clients/:email/activity - Get activity feed

**Integration-5c: SSO Impersonation**
- POST /api/clients/:id/impersonate - Generate SSO token (admin-only)
- 15-minute token expiry for security
- Audit logging with impersonator details
- Frontend "Login as Client" button

**Integration-6: Security Tokens**
- All tokens generated using crypto.randomBytes(32) - 256-bit entropy
- JWT_SECRET, WEBHOOK_SECRET, SERVICE_API_TOKEN, SSO_SECRET configured
- Tokens documented in INTEGRATION_CREDENTIALS.md

**Integration-7: Credentials Report**
- Comprehensive documentation in INTEGRATION_CREDENTIALS.md
- Includes all endpoints, authentication methods, and testing examples
- Ready for Trading Platform team implementation

### Role-Based Access Control (COMPLETE ✅)

- RouteGuard component enforces role-based page access
- All routes wrapped with role-specific guards
- Auto-redirect for unauthorized users
- Role access matrix:
  - Administrator: Full access to all features
  - CRM Manager: No access to User Management, Roles, API Keys
  - Team Leader: Team-scoped access only
  - Agent: Assigned clients only

## Recent Bug Fixes (October 14, 2025)

### Client & User Management Fixes ✅

1. **Client Creation Date Parsing**
   - Added server-side date parsing for dateOfBirth field
   - Supports DD.MM.YYYY, DD-MM-YYYY, and DD/MM/YYYY formats
   - Prevents "toISOString is not a function" errors

2. **User Creation Name Field**
   - Backend now properly combines firstName + lastName into single name field
   - Fixes "null value in column 'name'" database constraint violations

3. **Agent Dropdown Population**
   - Created new GET /api/users/agents endpoint
   - Returns only users with roles (agents) for dropdown filtering
   - All agent queries updated to use new endpoint in:
     - client-form.tsx
     - client-detail.tsx
     - clients.tsx

4. **Client Assignment**
   - Fixed apiRequest parameter order from (url, method, data) to (method, url, data)
   - Resolves "Method is not a valid HTTP token" errors
   - Updated in all mutation calls across:
     - client-detail.tsx (8 mutations fixed)
     - clients.tsx (bulk assign fixed)
     - client-form.tsx (create/update fixed)

### Client Details Enhancements ✅

**1. Pipeline Status System**
   - Added pipelineStatusEnum with 7 stages: new_lead, contact_attempted, in_discussion, kyc_pending, active_client, cold_inactive, lost
   - Visual badge in client header with color-coded variants (default/secondary/destructive)
   - Inline dropdown editor in Account Status card
   - Separate from existing client status for clarity

**2. Quick Action Buttons**
   - Call button with tel: link (disabled if no phone number)
   - Email button with mailto: link  
   - Add Comment button opens quick-entry dialog
   - Dialog properly handles async mutations with onSuccess/onError
   - Comment preserved on error for retry capability

**3. Enhanced Comments Section**
   - Backend enriches comments with user information (name)
   - Displays commenter avatar with initial
   - Shows commenter name and timestamp for each comment
   - Better visual hierarchy and prominence

**4. Activity Timeline**
   - Transformed History tab into comprehensive timeline
   - Combines comments, positions (trades), and transactions
   - Chronologically sorted (newest first)
   - Visual icons for each activity type
   - Timeline connector lines between activities
   - Shows relevant details per activity type

**5. Next Follow-up Date**
   - Added nextFollowUpDate field to clients schema
   - Date picker in Account Status card
   - Clear button to remove follow-up date
   - Proper error handling with success/error toasts
   - Simplified to date-only (not datetime) to avoid timezone complexity

## Recent Changes (October 15, 2025)

### Initial Balance Configuration ✅

**Issue:** New clients were receiving $10,000 initial balance instead of $0
**Fix Applied:**
- Updated webhook handler (`client.registered` event) to set initial balance to $0
- Updated manual client creation endpoint to set initial balance to $0
- Fixed webhook audit log to use `email` instead of undefined `clientId` variable
- All new accounts now start with:
  - `balance: '0'`
  - `realBalance: '0'`
  - `demoBalance: '0'`
  - `bonusBalance: '0'`
  - `equity: '0'`
  - `margin: '0'`
  - `freeMargin: '0'`

### Trading Platform Integration Guide ✅

**Created:** `TRADING_PLATFORM_INTEGRATION.md`
- Comprehensive shared database integration guide for Trading Platform AI
- Database schema documentation (clients, accounts, positions, orders, transactions)
- Step-by-step code examples:
  - Client registration via webhook
  - Position display (reading from database)
  - Opening/closing positions
  - Real-time P/L updates
  - Deposit/withdrawal/KYC webhooks
- Security credentials and HMAC signature verification
- Business rules (fund types, withdrawal validation, initiator types)
- Testing checklist and troubleshooting guide
- Common SQL queries reference

**Architecture:** Both CRM and Trading Platform share the same PostgreSQL database for instant synchronization, eliminating data duplication and sync delays.

## Multi-Fund Type System (COMPLETE ✅)

### Overview
The platform supports three distinct fund types per account, enabling flexible balance management for different trading scenarios:

**Fund Types:**
1. **Real Funds** (Green Badge) - Actual client money, withdrawable
2. **Demo Funds** (Blue Badge) - Practice/training balance, non-withdrawable
3. **Bonus Funds** (Yellow Badge) - Promotional credits, non-withdrawable

### Database Schema
- `accounts.realBalance` - Real funds balance
- `accounts.demoBalance` - Demo funds balance  
- `accounts.bonusBalance` - Bonus funds balance
- `accounts.balance` - Total balance (calculated as real + demo + bonus)
- `transactions.fundType` - ENUM('real', 'demo', 'bonus') - Tracks which fund type was affected

### Business Rules

**Withdrawal Validation:**
- ✅ Only real funds can be withdrawn
- ✅ Withdrawals automatically validate sufficient real balance before processing
- ✅ System blocks withdrawals if `realBalance < withdrawalAmount`
- ✅ Demo and bonus funds cannot be withdrawn under any circumstances

**Balance Management:**
- Admin-only access for balance adjustments and leverage changes
- Balance adjustments specify fund type (real/demo/bonus)
- Total balance is always calculated as: `realBalance + demoBalance + bonusBalance`
- All balance changes are audited with fund type, amount, and reason

### Admin Features

**Adjust Balance (Admin-only):**
- POST /api/accounts/:id/adjust-balance
- Parameters: amount (+ credit, - debit), fundType ('real'|'demo'|'bonus'), notes
- Comprehensive audit logging with old/new values
- Validates admin role with case-insensitive check

**Leverage Management (Admin-only):**
- PATCH /api/accounts/:id/leverage
- Editable dropdown: 1:1, 1:10, 1:20, 1:50, 1:100, 1:200, 1:500
- Audit logging tracks old and new leverage values

### UI Features

**Fund Breakdown Display:**
- Shows color-coded badges: Real (green) | Demo (blue) | Bonus (yellow)
- Displayed on client detail page below main balance
- Format: "Real: $X | Demo: $Y | Bonus: $Z"

**Transaction Fund Type Badges:**
- Every transaction shows fund type badge with color coding
- Displayed in both client detail transaction history and main transactions page
- Visual clarity for which fund type was affected

**Adjust Balance Dialog:**
- Amount input field (supports decimals)
- Fund type selector dropdown
- Notes/reason textarea for audit trail
- Success/error toast notifications

### Webhook Integration
The `withdrawal.completed` webhook validates and processes withdrawals:
1. Checks if `realBalance >= withdrawalAmount`
2. Returns 400 error if insufficient real funds
3. Deducts from `realBalance` only
4. Recalculates total balance
5. Logs operation with fund type details
6. Creates comprehensive audit trail

### Market Data (COMPLETE ✅)

**Twelve Data Ultra Plan - 406+ Trading Instruments:**

**Forex (94+ pairs):**
- Majors: EUR/USD, GBP/USD, USD/JPY, USD/CHF, AUD/USD, USD/CAD, NZD/USD
- Minors: EUR/GBP, EUR/JPY, GBP/JPY, EUR/CHF, GBP/CHF, EUR/AUD
- Exotics: USD/TRY, USD/ZAR, USD/MXN, USD/SGD, USD/HKD, USD/SEK, USD/NOK
- Full regional coverage: Scandinavian, Asian, Eastern European, Emerging Markets, Middle East & Africa

**Cryptocurrencies (188+ pairs):**
- Major: BTC, ETH, SOL, AVAX, MATIC, ADA, DOT, LINK, UNI, AAVE
- DeFi Tokens: SUSHI, COMP, YFI, CRV, BAL, SNX
- Gaming/Metaverse: SAND, MANA, AXS, ENJ, GALA
- Quote currencies: USD, BTC, ETH, USDT, EUR

**Commodities (35+ instruments):**
- Precious Metals: Gold (XAU/USD), Silver (XAG/USD), Platinum (XPT/USD), Palladium (XPD/USD)
- Energy: Crude Oil (CL1), Brent (CO1), Natural Gas (NG1), Heating Oil, Gasoline
- Agricultural: Corn (C_1), Wheat, Soybeans, Coffee (KC1), Cotton (CT1), Sugar, Cocoa (CC1)
- Industrial Metals: Copper (HG1), Aluminum, Zinc, Nickel, Lead

**Indices (54+ global markets):**
- US: S&P 500, Nasdaq 100, Dow Jones, Russell 2000, VIX
- Europe: FTSE 100, DAX, CAC 40, Euro Stoxx 50, IBEX 35, FTSE MIB
- Asia Pacific: Nikkei 225, Hang Seng, Shanghai Composite, ASX 200, KOSPI
- Latin America & Middle East: BOVESPA, IPC Mexico, TA-125

**Futures (35+ contracts):**
- Index, Treasury/Bond, Currency, Metal, Energy, Agricultural futures