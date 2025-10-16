# Trading Platform CRM

## Overview
This enterprise-grade CRM system for a trading platform manages clients, accounts, and trading operations. It features an in-house trading engine with real-time market data, comprehensive client management, role-based access control, and audit logging. Designed as a customizable template, it supports easy replication and export for various partners and brokers. The business vision is to provide a robust, scalable, and secure platform that streamlines trading operations and client relationship management for financial institutions.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
-   **Framework**: React with TypeScript (Vite).
-   **UI Components**: Shadcn UI (Radix UI primitives) with an enterprise, data-focused design inspired by Carbon Design System.
-   **State Management**: TanStack Query for server state; React Context for authentication; React hooks for local state.
-   **Styling**: Tailwind CSS with custom design tokens, supporting dark and light modes.
-   **Routing**: Wouter for client-side routing.
-   **Design Principles**: Emphasizes data clarity, a professional aesthetic, minimal cognitive load, and consistent patterns.

### Backend
-   **Runtime**: Node.js with Express.js.
-   **Database**: PostgreSQL via Neon serverless with connection pooling.
-   **ORM**: Drizzle ORM for type-safe operations.
-   **API Design**: RESTful API with WebSocket support for real-time market data.
-   **Authentication**: JWT-based authentication with bcrypt for password hashing and token-based authorization.

### Key Modules
1.  **Trading Engine**: Handles order types, position management, real-time P/L, Stop Loss/Take Profit, margin management, and order lifecycle.
2.  **Market Data Service**: Integrates with Twelve Data for real-time WebSocket streaming and REST API for historical data with caching.
3.  **Client Management**: Supports manual and API-based creation, bulk import, public registration with email verification, KYC tracking, balance/equity management, and trading history. Includes a Pipeline Status System, Multi-Fund Type System (Real, Demo, Bonus), and Admin features like `Adjust Balance` and `Leverage Management`.
4.  **Authorization System**: Dynamic role-based access control with custom role creation, granular permissions, team-based organization, and permission groups.
5.  **Audit System**: Comprehensive logging of all user actions, impersonation, and import/export operations.
6.  **Trading Platform Integration**: Features a Webhook Receiver, Service API, and SSO Impersonation, sharing a PostgreSQL database for synchronization.
7.  **Sales & Retention Workflow**: Implements client segmentation (Sales Clients, Retention Clients), FTD (First Time Deposit) workflow, and global trading views (Global Open/Closed Positions).
8.  **Trading Infrastructure**: Manages trading symbols (full CRUD with configuration for contract size, spread, leverage, etc.), symbol groups, and CFD accounts monitoring (real-time balance, equity, margin levels).
9.  **Communication & Scheduling (Phase 3)**: 
    -   **Calendar System**: Full-featured calendar with day/week/month grid views, event CRUD operations, filtering by type/status, client/user assignment, and iCal export functionality.
    -   **Email Templates**: Template management system with variable insertion for personalization, preview functionality, category organization, and search/filter capabilities.
    -   **Chat Backend**: REST API infrastructure for chat rooms and messages with read status tracking (frontend UI deferred to future phase).
10. **Reports & Analytics (Phase 4)**:
    -   **Enhanced Sales Dashboard**: Time series charts for FTD trends, conversion funnel visualization, agent performance comparison, date range filters (start/end), team/agent filters with custom queryFn pattern for proper parameter passing.
    -   **Affiliate Management System**: Complete affiliate program with database schema (affiliates, affiliate_referrals), backend API (9 endpoints for CRUD, referral tracking, commission calculation, payout management), management page, and dashboard with leaderboard and metrics visualization.
11. **Advanced Configuration (Phase 5)**:
    -   **Organizational Hierarchy**: Teams schema enhanced with parent-child relationships (parentTeamId, level, commissionSplit). Backend API supports org tree retrieval, child team queries, and performance rollup calculations.
    -   **Custom Statuses System**: Complete CRUD system with custom_statuses table (color, icon, category, allowedTransitions, automationTriggers). Production-ready management page with color picker, transition rules (JSON), and automation configuration. Uses local state pattern for JSON editing with validation on blur and pre-submission.
    -   **KYC Questions Builder**: Schema for dynamic KYC questions and responses (type, required, conditional logic). Backend API ready for question builder with reordering and response tracking.
    -   **Template Variables**: System for email/SMS personalization with backend infrastructure for variable management and client data interpolation.
    -   **Security Settings**: Infrastructure for IP whitelisting, session policies, and 2FA enforcement with backend API endpoints.

### Data Schema
-   **Core Entities**: Users, Clients, Accounts, Subaccounts, Orders, Positions, Transactions, Roles & Permissions, Teams (with hierarchy), Audit Logs, API Keys, Market Data, Symbol Groups, Trading Symbols, Calendar Events, Email Templates, Chat Rooms, Chat Messages, Affiliates, Affiliate Referrals, Custom Statuses, KYC Questions, KYC Responses, Template Variables, Security Settings.
-   **Key Relationships**: Clients to Accounts (1:1), Clients to Agents/Teams, Accounts to Subaccounts (1:N), Subaccounts to Orders/Positions (1:N), Users to Roles/Teams, Chat Rooms to Chat Messages (1:N), Affiliates to Affiliate Referrals (1:N), Teams to Parent Teams (hierarchical), Clients to KYC Responses (1:N).

## External Dependencies
-   **Market Data Provider**: Twelve Data (WebSocket and REST API for real-time and historical data).
-   **Database**: Neon PostgreSQL.
-   **UI Component Libraries**: Radix UI, Shadcn UI, Lucide React (icons).
-   **Development Tools**: TypeScript, Drizzle Kit, Zod, React Hook Form.
-   **Authentication**: jsonwebtoken, bcrypt.