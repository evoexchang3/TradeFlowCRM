# Trading Platform CRM

## Overview

This enterprise-grade CRM system for a trading platform manages clients, accounts, and trading operations. It features an in-house trading engine with real-time market data, comprehensive client management, role-based access control, and audit logging. Designed as a customizable template, it supports easy replication and export for various partners and brokers. The business vision is to provide a robust, scalable, and secure platform that streamlines trading operations and client relationship management for financial institutions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

**Framework**: React with TypeScript (Vite).
**UI Components**: Shadcn UI (Radix UI primitives) with an enterprise, data-focused design inspired by Carbon Design System.
**State Management**: TanStack Query for server state; React Context for authentication; React hooks for local state.
**Styling**: Tailwind CSS with custom design tokens, supporting dark and light modes.
**Routing**: Wouter for client-side routing.
**Design Principles**: Emphasizes data clarity, a professional aesthetic, minimal cognitive load, and consistent patterns.

### Backend

**Runtime**: Node.js with Express.js.
**Database**: PostgreSQL via Neon serverless with connection pooling.
**ORM**: Drizzle ORM for type-safe operations.
**API Design**: RESTful API with WebSocket support for real-time market data.
**Authentication**: JWT-based authentication with bcrypt for password hashing and token-based authorization.

**Key Modules**:

1.  **Trading Engine**: Handles order types, position management, real-time P/L, Stop Loss/Take Profit, margin management, and order lifecycle.
2.  **Market Data Service**: Integrates with Twelve Data for real-time WebSocket streaming and REST API for historical data with caching.
3.  **Client Management**: Supports manual and API-based creation, bulk import, public registration with email verification, KYC tracking, balance/equity management, and trading history.
4.  **Authorization System**: Dynamic role-based access control with custom role creation, granular permissions, team-based organization, and permission groups.
5.  **Audit System**: Comprehensive logging of all user actions, impersonation, and import/export operations.

### Data Schema

**Core Entities**: Users, Clients, Accounts, Subaccounts, Orders, Positions, Transactions, Roles & Permissions, Teams, Audit Logs, API Keys, Market Data.
**Key Relationships**: Clients to Accounts (1:1), Clients to Agents/Teams, Accounts to Subaccounts (1:N), Subaccounts to Orders/Positions (1:N), Users to Roles/Teams.

### UI/UX Decisions
- **Client Details Enhancements:** Implemented a Pipeline Status System with 7 stages and visual badges, Quick Action Buttons (Call, Email, Add Comment), an enhanced Comments Section displaying user information, and an Activity Timeline combining comments, positions, and transactions. Also added a `nextFollowUpDate` field.
- **Multi-Fund Type System:** Supports Real, Demo, and Bonus funds with distinct badges. Database schema includes `realBalance`, `demoBalance`, `bonusBalance`, and a calculated `balance`. Transaction records specify `fundType`.
- **Admin Features:** Admin-only access for `Adjust Balance` (specifying fund type) and `Leverage Management`. Both actions are audited.
- **Trading Platform Integration:** Features a Webhook Receiver, Service API, and SSO Impersonation. The systems share a PostgreSQL database for real-time synchronization.

## Recent Updates (October 15, 2025)

### Initial Balance Fix ✅
- Changed new client initial balance from $10,000 to $0
- Fixed in both webhook handler and manual client creation
- Fixed webhook audit log bug (undefined clientId reference)

### Trading Platform Integration Package ✅
Created complete integration documentation with actual credentials:

**Files Created:**
1. `SHARE_WITH_TRADING_PLATFORM.md` - Master summary and package overview
2. `TRADING_PLATFORM_QUICKSTART.md` - Quick start guide with all credentials included
3. `TRADING_PLATFORM_ENV.txt` - Copy-paste ready .env file with actual values
4. `TRADING_PLATFORM_INTEGRATION.md` - Complete technical integration guide
5. `TRADING_PLATFORM_CREDENTIALS.md` - Credential access and security guide

**Credentials Generated:**
- DATABASE_URL: Shared PostgreSQL connection (included in files)
- WEBHOOK_SECRET: HMAC signature secret (included in files)
- CRM_SERVICE_TOKEN: Bearer token for API calls (included in files)

**Ready to Share:** All files contain actual credentials - no manual setup needed!

### Position Edit P&L and Balance Fixes ✅
Fixed critical bugs in position modification causing incorrect P/L and balance corruption:

**Problems Fixed:**
1. ❌→✅ Missing contract multipliers in P/L calculations
2. ❌→✅ Fees not deducted from recalculated P/L
3. ❌→✅ Wrong field updated for closed positions (unrealizedPnl instead of realizedPnl)
4. ❌→✅ Fee compounding on repeated edits

**Implementation:**
- Closed positions: Calculate fees from first principles (`openFees + closeFees`) to prevent compounding
- Open positions: Include contract multiplier and deduct fees from unrealized P/L
- Balance adjustments: Correctly apply P/L difference (e.g., $10→$15 adds $5, $10→-$10 deducts $20)
- Transaction records: Created for all balance adjustments with detailed references
- Audit logs: Enhanced to track P/L changes, balance changes, and fee details

**Files Modified:**
- `server/services/trading-engine.ts` - modifyPosition() function
- `server/routes.ts` - Enhanced audit logging
- `POSITION_EDIT_FIXES.md` - Complete documentation of fixes

**Architect Approved:** ✅ All changes reviewed and verified correct

### Position Edit Manual P/L Override Fixes ✅
Fixed bugs preventing P/L recalculation and manual balance adjustments:

**Problems Fixed:**
1. ❌→✅ P/L not recalculating when open/close prices changed
2. ❌→✅ Manual P/L edits not adjusting account balance
3. ❌→✅ Validation too strict (blocked unchanged form values)
4. ❌→✅ Manual unrealized P/L overrides being overwritten by automatic recalculation

**Implementation - Four Edit Scenarios:**
1. **Closed - Automatic:** Change prices → P/L recalculates with fees/multiplier, balance adjusts
2. **Closed - Manual:** Set P/L value → Balance adjusts for difference, transaction created
3. **Open - Automatic:** Change prices → Unrealized P/L recalculates, equity updates
4. **Open - Manual:** Set unrealized P/L → Value preserved (not overwritten), equity updates

**Key Features:**
- Smart validation: Compares actual value changes, not just field presence
- Manual override preservation: Skips automatic recalculation to preserve manual values
- Conflict prevention: Cannot change prices AND manually override P/L in same request
- Transaction logging: All balance adjustments create detailed transaction records

**Files Modified:**
- `shared/schema.ts` - Added `realizedPnl` field to modifyPositionSchema
- `server/services/trading-engine.ts` - Complete overhaul of modifyPosition() logic
- `POSITION_EDIT_PNL_MANUAL_OVERRIDE_FIXES.md` - Complete documentation

**Architect Approved:** ✅ All changes reviewed and verified correct

### Sales & Retention Workflow Implementation ✅
Implemented complete Sales & Retention client segmentation system with FTD (First Time Deposit) workflow and global trading views.

**Frontend Pages Created:**
1. **Sales Clients** (`/clients/sales`) - View clients without FTD, pipeline status tracking
2. **Retention Clients** (`/clients/retention`) - View clients with FTD, retention management
3. **Global Open Positions** (`/trading/open-positions`) - View all open positions across all clients
4. **Global Closed Positions** (`/trading/closed-positions`) - View all closed positions across all clients
5. **Sales Dashboard** (`/reports/sales`) - Metrics dashboard with FTD analytics

**Backend API Endpoints:**
- GET `/api/clients/sales` - Returns clients without FTD (role-based filtering)
- GET `/api/clients/retention` - Returns clients with FTD (role-based filtering)
- POST `/api/clients/:id/mark-ftd` - Marks First Time Deposit, updates balances, creates transactions, audit logs
- GET `/api/positions/all/open` - Returns all open positions with client enrichment
- GET `/api/positions/all/closed` - Returns all closed positions with client enrichment

**Key Features:**
- **FTD Workflow**: Sales agents mark client's first deposit, automatically moves client to retention queue
- **Role-Based Access**: Agents see only their clients, Team Leaders see team clients, Admins see all
- **Fund Type Support**: Mark FTD with Real, Demo, or Bonus funds
- **Balance Integration**: FTD automatically adds funds to client account and creates transaction record
- **Audit Logging**: All FTD actions logged with amount, fund type, and notes
- **Form Architecture**: Mark FTD dialog uses proper useForm + Form + zodResolver pattern for validation

**Database Schema Updates:**
- Added FTD tracking columns to `clients` table: `has_ftd`, `ftd_date`, `ftd_amount`, `ftd_fund_type`
- Created `symbol_groups` table for organizing trading symbols
- Created `trading_symbols` table for managing available symbols
- Created `calendar_events` table for scheduling follow-ups
- Created `email_templates` table for standardized communications

**Navigation Updates:**
- Added "Sales Clients", "Retention Clients" to main navigation
- Added "Open Positions", "Closed Positions" for global trading views
- Added "Sales Dashboard" for leadership metrics

**Files Created/Modified:**
- `client/src/pages/sales.tsx` - Sales clients page with Mark FTD dialog
- `client/src/pages/retention.tsx` - Retention clients page
- `client/src/pages/global-open-positions.tsx` - Global open positions view
- `client/src/pages/global-closed-positions.tsx` - Global closed positions view
- `client/src/pages/sales-dashboard.tsx` - Sales metrics dashboard
- `client/src/App.tsx` - Added 6 new routes with role guards
- `client/src/components/app-sidebar.tsx` - Added navigation menu items
- `server/routes.ts` - Added 5 new API endpoints

**Architect Approved:** ✅ Form refactoring and backend endpoints reviewed and verified correct

## External Dependencies

**Market Data Provider**:
-   **Twelve Data**: Primary source for forex, crypto, metals, commodities, and indices. Uses WebSocket API for real-time streaming and REST API for historical data. Includes Ultra Plan with 406+ trading instruments.

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