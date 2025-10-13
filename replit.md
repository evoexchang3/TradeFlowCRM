# Trading Platform CRM

## Overview

This is an enterprise-grade CRM system for a trading platform, designed to manage clients, accounts, and trading operations. The platform features an in-house trading engine with real-time market data integration, comprehensive client management, role-based access control, and audit logging capabilities.

The system is built as a customizable template that can be individually tailored for different partners and brokers, with easy replication and export capabilities.

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
   - Order types: Market, Limit, Stop, Stop-Limit
   - Position management (open, close, modify, partial close)
   - Real-time P/L calculations (realized and unrealized)
   - Automatic Stop Loss/Take Profit triggers
   - Margin management and validation
   - Position ownership enforcement

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
- Clients (customer accounts with KYC)
- Accounts (trading accounts linked to clients)
- Orders (pending and filled trading orders)
- Positions (open and closed trading positions)
- Transactions (deposits and withdrawals)
- Roles & Permissions (dynamic access control)
- Teams (organizational grouping)
- Audit Logs (activity tracking)
- Market Data (quotes and candles with caching)

**Key Relationships**:
- Clients have one-to-one relationship with Accounts
- Accounts have one-to-many relationships with Orders, Positions, and Transactions
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