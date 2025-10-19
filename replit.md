# Trading Platform CRM

## Overview
This enterprise-grade CRM system for a trading platform manages clients, accounts, and trading operations. It features an in-house trading engine with real-time market data, comprehensive client management, role-based access control, and audit logging. Designed as a customizable template, it supports easy replication and export for various partners and brokers. The business vision is to provide a robust, scalable, and secure platform that streamlines trading operations and client relationship management for financial institutions.

## Recent Changes

### P/L Calculation Fix (October 19, 2025)
Fixed critical P/L calculation errors affecting all trading positions. The system now correctly handles instrument-aware position sizing with lot-to-units conversion for forex instruments.

**Changes Made:**
- Added `getPositionUnits()` helper function in `server/config/instruments.ts` to convert forex lots to base units
- Updated P/L formulas in `updatePositionPnL()`, `closePosition()`, and `modifyPosition()` to use correct position units
- Forex positions: Quantity stored in "lots" is converted to base units (lots × lotSize = 100,000) before P/L calculation
- Other instruments (crypto, indices, commodities): Quantity used as-is

**Formula:**
- Gross P/L = priceChange × positionUnits × contractMultiplier
- For forex: positionUnits = lots × lotSize (e.g., 0.01 lots × 100,000 = 1,000 units)
- For crypto/indices: positionUnits = quantity (no conversion)

**Impact:** All P/L calculations now accurately reflect profits and losses across all instrument types.

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
-   **Trading Engine**: Handles order types, position management, real-time P/L, Stop Loss/Take Profit, margin management, and order lifecycle.
-   **Market Data Service**: Integrates with Twelve Data for real-time WebSocket streaming and REST API for historical data with caching.
-   **Client Management**: Supports manual and API-based creation, bulk import, public registration with email verification, KYC tracking, balance/equity management, and trading history. Includes a Pipeline Status System, Multi-Fund Type System, and Admin features. Features enhanced client metadata and comprehensive sales/retention workflows with custom statuses, agent assignment, and bulk operations.
-   **Authorization System**: Dynamic role-based access control with custom role creation, granular permissions, team-based organization, and permission groups.
-   **Audit System**: Comprehensive logging of all user actions, impersonation, and import/export operations, with advanced filtering and CSV export.
-   **Trading Platform Integration**: Features a Webhook Receiver, Service API, and SSO Impersonation.
-   **Trading Infrastructure**: Manages trading symbols (CRUD with configuration), symbol groups, and CFD accounts monitoring.
-   **Communication & Scheduling**: Includes a full-featured calendar system, email template management, and chat backend infrastructure.
-   **Reports & Analytics**: Features an enhanced sales dashboard with time-series charts and an affiliate management system with comprehensive tracking and payout management.
-   **Advanced Configuration**: Includes organizational hierarchy management, a custom statuses system with transition rules, a KYC questions builder, template variable management, and security settings (IP whitelisting, 2FA).
-   **Global Client Search**: Provides advanced multi-criteria search with pagination, saved filter presets, and quick search functionality in the header.
-   **Performance Targets & Gamification**: Implements performance targets, achievements, and a leaderboard UI for agents and teams.
-   **Multi-Language Internationalization (i18n)**: Production-ready translation infrastructure supporting 16 languages with 100% application coverage, using React Context and locale persistence.
-   **Communication & Payment Integration**: Implements a full chat system, SMTP settings for email delivery, and multi-provider payment integration management.

### Data Schema
Core entities include Users, Clients, Accounts, Orders, Positions, Roles & Permissions, Teams (hierarchical), Audit Logs, Market Data, Trading Symbols, Calendar Events, Email Templates, Chat Rooms, Affiliates, Custom Statuses, KYC Questions, Template Variables, Security Settings, SMTP Settings, Payment Providers, Saved Filters, Performance Targets, and Achievements. Key relationships exist between these entities to support the CRM's functionality.

### Navigation Structure
The application sidebar is organized into Main Menu (Dashboard, Client views, Trading views, etc.), Management (User, Role, Team management, Audit Logs), and Configuration (Admin-only advanced settings like Organizational Hierarchy, Custom Statuses, KYC Questions, Security, SMTP, Payment Providers). All navigation items are role-based.

## External Dependencies
-   **Market Data Provider**: Twelve Data (WebSocket and REST API).
-   **Database**: Neon PostgreSQL.
-   **UI Component Libraries**: Radix UI, Shadcn UI, Lucide React (icons).
-   **Development Tools**: TypeScript, Drizzle Kit, Zod, React Hook Form.
-   **Authentication**: jsonwebtoken, bcrypt.