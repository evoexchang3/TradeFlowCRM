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