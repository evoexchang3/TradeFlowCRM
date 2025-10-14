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