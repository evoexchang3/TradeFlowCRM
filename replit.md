# Trading Platform CRM

## Overview

This enterprise-grade CRM system for a trading platform manages clients, accounts, and trading operations. It features an in-house trading engine with real-time market data, comprehensive client management, role-based access control, and audit logging. Designed as a customizable template, it can be tailored for various partners and brokers, supporting easy replication and export. The business vision is to provide a robust, scalable, and secure platform that streamlines trading operations and client relationship management for financial institutions.

## Recent Changes

**October 13, 2025 - Phase 3: Client Assignment System (COMPLETE ✅)**

- **Single Client Assignment UI** (Phase 3-1) - Architect Approved ✅
  - GET /api/users endpoint: Returns sanitized user list for assignment dropdowns
  - Assignment Dropdowns: Agent and Team selects in client details Account Status card
  - Real-time updates via query cache invalidation on assignment change
  - Proper loading states with disabled dropdowns during mutations
  - Uses existing PATCH /api/clients/:id/assign endpoint

- **Bulk Assignment UI** (Phase 3-2) - Architect Approved ✅
  - Multi-select system with checkboxes (individual + select all)
  - Bulk action bar: Shows selected count, clear selection, and assign buttons
  - Bulk assign dialog with optional agent/team dropdowns
  - State management using Set for O(1) client ID lookups
  - Uses existing POST /api/clients/bulk-assign endpoint
  - Complete state cleanup on success (selection + form state)

- **Team Overview Page** (Phase 3-3) - Architect Approved ✅
  - GET /api/teams/:id endpoint: Fetches team with sanitized leader data (password removed)
  - Team dashboard: 4 metric cards (total clients, members, balance, conversions)
  - Team members section: Lists members with client distribution per agent
  - Client distribution table: Shows agent breakdown with percentages
  - Team clients table: Full client list with clickable names
  - Security: Password properly sanitized from leader data
  - Authentication: Uses default query fetcher with auth headers

- **Role-Based Visibility Filters** (Phase 3-4) - Architect Approved ✅
  - GET /api/clients endpoint now enforces role-based access control
  - Administrator/CRM Manager: See all clients
  - Team Leader: See only clients in their team (teamId filter)
  - Agent: See only clients assigned to them (assignedAgentId filter)
  - Client type users blocked from staff endpoints
  - Case-insensitive role name matching, graceful fallbacks

- **Visibility Filter UI** (Phase 3-5) - Architect Approved ✅
  - Three filter dropdowns: Team, Agent, Status in client list page
  - Real-time client-side filtering with AND logic
  - "All", "Unassigned", and specific options for each filter
  - Clear Filters button when any filter is active
  - Shows "X of Y clients" count when filters are applied
  - Combines with search functionality seamlessly

- **Client Transfer Workflow** (Phase 3-6) - Architect Approved ✅
  - POST /api/clients/:id/transfer endpoint with full validation
  - Transfer dialog with new agent/team selection and required reason field
  - Automatic status change to "reassigned" on transfer
  - Comprehensive audit log with before/after values and transfer reason
  - Auto-creates comment documenting the transfer
  - Transfer button in client detail header
  - Role-based permissions (client.edit or administrator)
  - Real-time UI updates with cache invalidation

**October 13, 2025 - Phase 4: Enhanced Dashboards (IN PROGRESS 🔄)**

- **Assignment Metrics API** (Phase 4-1) - Architect Approved ✅
  - GET /api/metrics/assignments endpoint with staff-only access guard
  - Security: Blocks client-type users with 403 Forbidden
  - Role-based filtering: Admin/CRM Manager see all, Team Leader sees team, Agent sees assigned
  - Returns comprehensive metrics: total/assigned/unassigned clients, with/without team
  - Breakdowns: byStatus (count per status), byTeam (sorted by count), byAgent (sorted by count)

- **Assignment Metrics Widgets** (Phase 4-2) - Architect Approved ✅
  - Four metric cards: Total clients, Assigned (with %), Unassigned (with %), With Teams (with %)
  - Client Status Breakdown: Top 8 statuses with progress bars and color-coded labels
  - Top Teams by Client Count: Top 6 teams with progress bars showing percentage
  - Top Agents by Client Count: Top 9 agents in responsive grid with avatars and progress bars
  - Real-time data, loading states, proper empty states, TypeScript typed responses

**Previous Phases Completed:**
- Phase 1: Client Status Pipeline (12 statuses) & Comments System - Architect Approved ✅
- Phase 2: Internal Transfers System (Full Stack) - Architect Approved ✅
  - Transfer API with Zod validation, atomic transactions, audit logging
  - Transfer UI with source/destination dropdowns, amount validation
  - Transfer history with subaccount/date filters and CSV export
- Phase 3: Client Assignment System (6 sub-phases) - All Architect Approved ✅

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

1.  **Trading Engine**: Handles various order types (Market, Limit, Stop, Stop-Limit), position management, real-time P/L calculations, automatic Stop Loss/Take Profit, margin management, and order lifecycle. Includes bid/ask discipline and handles missing quote data.
2.  **Market Data Service**: Integrates with Twelve Data for WebSocket streaming of live quotes and REST API for historical candle data with caching. Features a simulation mode and efficient credit usage.
3.  **Client Management**: Supports manual and API-based client creation, bulk import, public registration with email verification, KYC tracking, account balance/equity management, and trading activity history.
4.  **Authorization System**: Dynamic role-based access control with custom role creation, granular permissions, team-based organization, and permission groups for various operations.
5.  **Audit System**: Comprehensive logging of all user actions, impersonation, and import/export operations.

### Data Schema

**Core Entities**: Users, Clients (with assignedAgentId and teamId), Accounts, Subaccounts, Orders, Positions, Transactions, Roles & Permissions, Teams, Audit Logs, API Keys, Market Data.
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

**Build & Dev Tools**:
-   **Vite**: Frontend bundling and dev server.
-   **esbuild**: Backend bundling.
-   **tsx**: TypeScript execution in development.