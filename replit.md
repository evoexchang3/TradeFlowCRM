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