# Trading Platform CRM

## Overview

This is an enterprise-grade CRM system for a trading platform, designed to manage clients, accounts, and trading operations. The platform features an in-house trading engine with real-time market data integration, comprehensive client management, role-based access control, and audit logging capabilities.

The system is built as a customizable template that can be individually tailored for different partners and brokers, with easy replication and export capabilities.

## Recent Changes

**October 13, 2025 - Phase 1 & 2 Complete: Client Pipeline Status, Comments System, Subaccounts UI, Internal Transfers (Backend+Frontend)**
- **Client Status Pipeline** (Phase 1): 12-status enum for tracking client lifecycle
  - Statuses: new, reassigned, potential, low/mid/high_potential, no_answer, voicemail, callback_requested, not_interested, converted, lost
  - Status dropdown in client detail page with real-time update via PATCH /api/clients/:id
  - Status changes tracked in audit logs
- **Client Comments System** (Phase 1): Internal collaboration tool for staff
  - Schema: clientComments table with clientId, userId, comment, timestamps
  - API Endpoints:
    - GET /api/clients/:id/comments - List all comments for client
    - POST /api/clients/:id/comments - Add comment (staff only)
    - PATCH /api/comments/:id - Edit comment (CRM Manager/Team Leader/Admin only)
    - DELETE /api/comments/:id - Delete comment (CRM Manager/Team Leader/Admin only)
  - UI: Comments tab in client details with add/edit/delete, shows author, timestamp, "edited" indicator
- **Subaccounts UI** (Phase 2): Frontend for multi-subaccount management
  - Subaccounts tab in client details showing table with name, currency, balance, equity, margin, status, default indicator
  - Create Subaccount dialog with name and currency (USD/EUR/GBP/JPY)
  - Proper query with accountId parameter and cache invalidation
- **Internal Transfers Schema** (Phase 2): Database table for subaccount-to-subaccount transfers
  - Schema: internalTransfers table with fromSubaccountId, toSubaccountId, amount, userId, status, notes, timestamps
  - Transfer status enum: pending, completed, rejected
  - Proper relations to subaccounts and users
- **Architect Approval**: All Phase 1 and Phase 2 tasks reviewed and approved
- **Remaining Work**: Internal transfer API (phase2-4), transfer UI (phase2-5), transfer history (phase2-6), client assignment UI (phase3+), enhanced dashboards (phase4+)

**October 13, 2025 - Milestone 3 Complete: Subaccount Architecture & Team-Based Client Assignment (Backend)**
- **Subaccount Architecture**: Multi-subaccount support per trading account
  - Schema: Added `subaccounts` table with fields: accountId, name, currency, balance, equity, margin, isDefault, isActive
  - Database Relations: orders/positions now link to subaccountId (optional, for backward compatibility)
  - API Endpoints:
    - GET /api/subaccounts?accountId=xxx - List subaccounts with ownership verification
    - POST /api/subaccounts - Create subaccount (requires balance.adjust permission or ownership)
    - PATCH /api/subaccounts/:id - Update subaccount (whitelisted fields: name, isDefault, isActive)
  - Security: Client ownership verified, staff requires 'balance.view'/'balance.adjust' permissions, balance/accountId manipulation blocked
- **Team-Based Client Assignment**: Assign clients to agents/teams
  - API Endpoints:
    - PATCH /api/clients/:id/assign - Single client assignment with partial update support
    - POST /api/clients/bulk-assign - Bulk assignment with audit logging
  - Authorization: Requires 'client.edit' permission or Administrator role
  - Security: Staff-only access, proper role verification, comprehensive audit logging
- **Security Model**: All endpoints secured with role-based permissions, ownership validation, and field whitelisting
- **Remaining Work**: Frontend UI for subaccounts (subaccount-4/5), assignment UI (team-assignment-3/4/5)

**October 13, 2025 - Milestone 2 Complete: Role-Based Dashboards & Trading Platform Integration**
- **Simplified Login**: Removed role tabs from landing page - role auto-detected from authenticated user
- **Role-Based Dashboards**: Created dedicated dashboard components for each role:
  - AdminDashboard (/admin): System-wide metrics, health status, platform overview
  - CRMDashboard (/crm): Client metrics, team performance, conversion rates
  - TeamDashboard (/team): Team member stats, assigned clients, performance tracking
  - AgentDashboard (/agent): Personal client list, daily tasks, individual metrics
- **Dynamic Sidebar Navigation**: Menu items filtered by user role/permissions
  - Admin: All pages (roles, teams, API keys, import/export, audit)
  - CRM Manager: Teams, import/export, audit logs
  - Team Leader: Teams only
  - Agent: No management pages
- **Trading Platform Integration**:
  - Webhook endpoint: POST /api/webhooks/site with HMAC-SHA256 signature verification
  - Supports 11 event types (order.placed, position.closed, balance.updated, etc.)
  - SSO impersonation: POST /sso/impersonate (admin-only), GET /sso/consume
  - Admin ID derived from authenticated session (prevents privilege escalation)
  - Service-level API token generation via existing API key system
  - Comprehensive integration documentation (TRADING_PLATFORM_INTEGRATION.md)
- **Security**: All integration endpoints secured with HMAC signatures, JWT tokens, role verification, and audit logging

**October 13, 2025 - Milestone 1 Complete: API Key Management System**
- **Backend**: Secure API key CRUD endpoints at `/api/admin/api-keys`
  - POST /api/admin/api-keys: Generate API keys with bcrypt hashing
  - GET /api/admin/api-keys: List all API keys (keyHash never exposed)
  - DELETE /api/admin/api-keys/:id: Revoke API keys with ownership validation
  - Zod validation with support for ISO datetime strings and optional fields
  - Audit logging for all API key operations (create, revoke)
- **Frontend**: Complete API key management UI at `/api-keys`
  - Create dialog with proper shadcn Form + useForm + zodResolver validation
  - Client-side validation prevents empty name submission with inline errors
  - One-time key display card with copy-to-clipboard functionality
  - List view with status badges (active/revoked) and scope indicators
  - Revoke functionality with confirmation dialog
  - Integration with TanStack Query for optimistic updates
- **Security**: API keys use bcrypt hashing, plaintext key shown only once on creation, keyHash never exposed in responses
- **Form Pattern**: All forms now follow required shadcn pattern (Form + useForm + zodResolver) instead of raw useState

**October 13, 2025 - Milestone 0 Complete: Role-Based Landing Page**
- Created professional landing page at `/` with tab-based role selection (Administrator, CRM Manager, Team Leader, Agent)
- Implemented role-specific post-login redirects (Admin→/admin, CRM Manager→/crm, Team Leader→/team, Agent→/agent)
- Added auth protection to dashboard routes - unauthenticated users redirected to landing page
- Seeded default admin account: apitwelve001@gmail.com / Admin123
- Added logout functionality to sidebar footer with proper token cleanup
- Fixed token race condition by setting localStorage immediately before role fetch
- Created GET /api/roles/:id endpoint for role-based routing

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**UI Components**: Shadcn UI library with Radix UI primitives, following a data-focused enterprise design approach inspired by Carbon Design System

**State Management**: 
- TanStack Query (React Query) for server state management
- React Context for authentication state
- Local state with React hooks

**Styling**: Tailwind CSS with custom design tokens for consistent theming, supporting both dark and light modes with dark mode as the primary interface

**Routing**: Wouter for client-side routing

**Key Design Principles**:
- Data clarity over decoration
- Professional, trustworthy aesthetic optimized for high-stakes trading environments
- Minimal cognitive load during critical operations
- Consistent patterns across all views

### Backend Architecture

**Runtime**: Node.js with Express.js framework

**Database**: PostgreSQL via Neon serverless with connection pooling

**ORM**: Drizzle ORM for type-safe database operations and schema management

**API Design**: RESTful API with WebSocket support for real-time market data streaming

**Authentication**: JWT-based authentication with bcrypt password hashing, token-based authorization on protected endpoints

**Key Modules**:

1. **Trading Engine** - In-house implementation handling:
   - Order types: Market, Limit, Stop, Stop-Limit (all fully implemented)
   - Position management (open, close, modify, partial close)
   - Real-time P/L calculations (realized and unrealized)
   - Automatic Stop Loss/Take Profit triggers
   - Margin management and validation
   - Position ownership enforcement
   - Order lifecycle: pending → filled/cancelled
   - Cancel order functionality with ownership validation
   - Pending orders checked every 5 seconds against live quotes
   - Bid/ask discipline: Limit Buy uses ask, Limit Sell uses bid, Stop Buy uses ask, Stop Sell uses bid
   - Missing bid/ask handling: Orders skipped if quote data incomplete (prevents erroneous execution)

2. **Market Data Service** - Twelve Data integration providing:
   - WebSocket streaming for live quotes (one subscription per symbol, relay to unlimited clients)
   - REST API for historical candle data with caching
   - Simulation mode when API key unavailable
   - Efficient credit usage (500 WS credits = 500 symbols to unlimited users)

3. **Client Management** - Comprehensive CRM features:
   - Manual client creation, API-based creation, bulk import from Excel/CSV
   - Public registration with email verification
   - KYC status tracking and document management
   - Account balance and equity management
   - Trading activity and position history

4. **Authorization System** - Dynamic role-based access control:
   - Custom role creation with granular permissions
   - Team-based organization with team leaders
   - Permission groups for client management, trading, balance operations, administration, and data operations

5. **Audit System** - Comprehensive activity logging:
   - All user actions tracked (login, client operations, trade modifications, role changes, data operations)
   - Impersonation tracking
   - Import/export operation logging

### Data Schema

**Core Entities**:
- Users (admin/agent/team leader profiles)
- Clients (customer accounts with KYC, includes assignedAgentId and teamId)
- Accounts (trading accounts linked to client)
- Subaccounts (multiple trading subaccounts per account with independent balances)
- Orders (pending and filled trading orders, linked to subaccount)
- Positions (open and closed trading positions, linked to subaccount)
- Transactions (deposits and withdrawals)
- Roles & Permissions (dynamic access control)
- Teams (organizational grouping)
- Audit Logs (activity tracking)
- API Keys (external platform integration with scope-based access)
- Market Data (quotes and candles with caching)

**Key Relationships**:
- Clients have one-to-one relationship with Accounts
- Clients can be assigned to Agents (assignedAgentId) and Teams (teamId)
- Accounts have one-to-many relationship with Subaccounts
- Subaccounts have one-to-many relationships with Orders and Positions
- Users belong to Roles and Teams
- All modifications tracked in Audit Logs

### External Dependencies

**Market Data Provider**:
- Twelve Data (https://twelvedata.com) - Primary data source for forex, crypto, metals, and commodities
- WebSocket API for real-time price streaming
- REST API for historical candle data
- Fallback to REST polling when WebSocket unavailable

**Database**:
- Neon PostgreSQL serverless database
- WebSocket-based connection via @neondatabase/serverless

**UI Component Libraries**:
- Radix UI primitives for accessible components
- Shadcn UI component collection
- Lucide React for icons

**Development Tools**:
- TypeScript for type safety
- Drizzle Kit for database migrations
- Zod for runtime validation
- React Hook Form for form management

**Authentication**:
- jsonwebtoken for JWT token generation and verification
- bcrypt for password hashing

**Build & Dev Tools**:
- Vite for frontend bundling and dev server
- esbuild for backend bundling
- tsx for TypeScript execution in development