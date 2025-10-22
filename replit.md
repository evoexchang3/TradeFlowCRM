# Trading Platform CRM

## Overview
This project is an enterprise-grade CRM system for a trading platform. Its primary purpose is to manage clients, accounts, and trading operations, featuring an in-house trading engine with real-time market data, comprehensive client management, role-based access control, and audit logging. The system is designed as a customizable template for replication and export to various partners and brokers. The business vision is to deliver a robust, scalable, and secure platform that optimizes trading operations and client relationship management for financial institutions, enhancing efficiency and client engagement.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
-   **Framework**: React with TypeScript (Vite).
-   **UI Components**: Shadcn UI (Radix UI primitives) for an enterprise, data-focused design.
-   **State Management**: TanStack Query for server state; React Context for authentication; React hooks for local state.
-   **Styling**: Tailwind CSS with custom design tokens, supporting dark and light modes.
-   **Routing**: Wouter for client-side routing.
-   **Design Principles**: Focus on data clarity, professional aesthetics, minimal cognitive load, and consistent patterns.

### Backend
-   **Runtime**: Node.js with Express.js.
-   **Database**: PostgreSQL via Neon serverless with connection pooling.
-   **ORM**: Drizzle ORM for type-safe operations.
-   **API Design**: RESTful API with WebSocket support for real-time market data and chat.
-   **Authentication**: JWT-based authentication with bcrypt for password hashing and token-based authorization.

### Key Modules
-   **Trading Engine**: Manages order types, position management, real-time P/L, Stop Loss/Take Profit, and margin.
-   **Market Data Service**: Integrates with Twelve Data for real-time and historical market data.
-   **Client Management**: Features manual and API-based creation, bulk import, public registration with email verification, KYC tracking, balance/equity management, trading history, pipeline status, multi-fund types, and comprehensive sales/retention workflows.
-   **Authorization System**: Dynamic role-based access control with custom role creation, granular permissions, and team-based organization.
-   **Audit System**: Comprehensive logging of user actions, impersonation, and data import/export, with filtering and CSV export.
-   **Trading Platform Integration**: Includes a Webhook Receiver, Service API, and SSO Impersonation.
-   **Trading Infrastructure**: Manages trading symbols (CRUD) and CFD accounts.
-   **Communication & Scheduling**: Features a full-featured calendar system (including recurring events), email template management, and a WebSocket chat backend with file attachments.
-   **Reports & Analytics**: Provides an enhanced sales dashboard with time-series charts and an affiliate management system.
-   **Advanced Configuration**: Includes organizational hierarchy, custom statuses with transition rules, KYC questions builder, template variable management, and security settings (IP whitelisting, 2FA).
-   **Global Client Search**: Offers advanced multi-criteria search with pagination, saved filter presets, and quick search.
-   **Performance Targets & Gamification**: Implements performance targets, achievements, and a leaderboard.
-   **Multi-Language Internationalization (i18n)**: Supports 16 languages with 100% application coverage.
-   **Communication & Payment Integration**: Manages a full chat system, SMTP settings, and multi-provider payment integrations.

### Data Schema
Core entities include Users, Clients, Accounts, Orders, Positions, Position Tags, Roles & Permissions, Teams, Audit Logs, Market Data, Trading Symbols, Calendar Events, Email Templates, Chat Rooms, Affiliates, Custom Statuses, KYC Questions, Template Variables, Security Settings, SMTP Settings, Payment Providers, Saved Filters, Performance Targets, and Achievements.

### Navigation Structure
The application sidebar is organized into Main Menu (Dashboard, Client views, Trading views), Management (User, Role, Team, Audit Logs), and Configuration (Admin-only advanced settings). All navigation is role-based.

## External Dependencies
-   **Market Data Provider**: Twelve Data (WebSocket and REST API).
-   **Database**: Neon PostgreSQL.
-   **UI Component Libraries**: Radix UI, Shadcn UI, Lucide React (icons).
-   **Development Tools**: TypeScript, Drizzle Kit, Zod, React Hook Form.
-   **Authentication**: jsonwebtoken, bcrypt.