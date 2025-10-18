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
7.  **Sales & Retention Workflow**: Implements client segmentation (Sales Clients, Retention Clients), FTD (First Time Deposit) workflow, and global trading views (Global Open/Closed Positions). **Feature Parity Achieved**: Sales and Retention pages now include complete All Clients functionality - custom status integration with dropdowns, agent/team assignment, KYC status management, bulk operations (select/assign), enhanced filters (agent, custom status), action buttons (Call/Mail/Comment), dialogs (bulk assign, comments), and MoreVertical menus (View/Edit/Chat). Unique features preserved: Mark FTD for Sales, View Activity for Retention. **Enhanced Client Metadata**: All client list endpoints now include last comment date, last comment preview (50 chars), and registration date using efficient batch SQL queries with empty-array guards.
8.  **Trading Infrastructure**: Manages trading symbols (full CRUD with configuration for contract size, spread, leverage, etc.), symbol groups, and CFD accounts monitoring (real-time balance, equity, margin levels).
9.  **Communication & Scheduling (Phase 3)**: 
    -   **Calendar System**: Full-featured calendar with day/week/month grid views, event CRUD operations, filtering by type/status, client/user assignment, and iCal export functionality.
    -   **Email Templates**: Template management system with variable insertion for personalization, preview functionality, category organization, and search/filter capabilities.
    -   **Chat Backend**: REST API infrastructure for chat rooms and messages with read status tracking (frontend UI deferred to future phase).
10. **Reports & Analytics (Phase 4)**:
    -   **Enhanced Sales Dashboard**: Time series charts for FTD trends, conversion funnel visualization, agent performance comparison, date range filters (start/end), team/agent filters with custom queryFn pattern for proper parameter passing.
    -   **Affiliate Management System**: Complete affiliate program with database schema (affiliates, affiliate_referrals), backend API (9 endpoints for CRUD, referral tracking, commission calculation, payout management), management page, and dashboard with leaderboard and metrics visualization.
11. **Advanced Configuration (Phase 5)**:
    -   **Organizational Hierarchy**: Teams schema enhanced with parent-child relationships (parentTeamId, level, commissionSplit). Backend API supports org tree retrieval, child team queries, and performance rollup calculations. Frontend page with tree visualization and management UI.
    -   **Custom Statuses System**: Complete CRUD system with custom_statuses table (color, icon, category, allowedTransitions, automationTriggers). Production-ready management page with color picker, transition rules (JSON), and automation configuration. Uses local state pattern for JSON editing with validation on blur and pre-submission.
    -   **KYC Questions Builder**: Schema for dynamic KYC questions and responses (type, required, conditional logic). Backend API ready for question builder with reordering and response tracking. Frontend page with question builder UI.
    -   **Template Variables**: System for email/SMS personalization with backend infrastructure for variable management and client data interpolation. Frontend page for variable management.
    -   **Security Settings**: Infrastructure for IP whitelisting, session policies, and 2FA enforcement with backend API endpoints. Frontend page for security configuration.
12. **Communication & Payment Integration (Phase 6)**:
    -   **Chat System**: Full-featured chat application with REST API (6 endpoints for rooms and messages), real-time messaging UI, room management, and read status tracking. Frontend integrated with backend API.
    -   **SMTP Settings**: Email delivery configuration system with smtp_settings table (host, port, encryption, credentials). Backend API (4 CRUD endpoints) with Zod validation and admin authorization. Ready for frontend implementation.
    -   **Payment Providers**: Multi-provider payment integration with payment_providers table (name, type, API credentials, routing rules). Backend API (4 CRUD endpoints) with Zod validation and admin authorization. Ready for frontend implementation.
13. **Global Client Search (Task 12)**:
    -   **Advanced Search Backend**: POST /api/clients/search endpoint with multi-criteria filtering (query text, team, agent, custom status, KYC status, FTD status, language, registration date range, FTD date range) with pagination support.
    -   **Saved Filter Presets**: Complete CRUD system with saved_filters table for storing user-specific filter configurations. Backend API (4 endpoints: GET all, POST create, PATCH update, DELETE). Support for default filter per user with automatic application on page load.
    -   **Global Search Page**: Full-featured search interface at /search/global with advanced filter form, results table displaying client details (name, email, status, team, agent, KYC status, FTD info), saved preset management with star/unstar for defaults, and pagination controls.
    -   **Header Quick Search**: Omnipresent search input in header with live autocomplete (shows top 5 results), client navigation on result click, and "View All Results" link that navigates to global search with query parameter pre-populated. Implements click-outside-to-close and loading states for optimal UX.
14. **Performance Targets & Gamification (Task 13)**:
    -   **Database Schema**: performance_targets table with target metrics (FTD count, volume, revenue) by period (daily/weekly/monthly/quarterly), achievements table with badge/streak/milestone/level types, and targetPeriodEnum/achievementTypeEnum enums.
    -   **Backend API**: /api/targets CRUD endpoints with Zod validation, /api/achievements endpoints for tracking, /api/leaderboard endpoint with agent/team/period filtering and ranking logic.
    -   **Leaderboard Page**: Gamification UI with period filters, top 3 podium display, rankings table showing achievements and performance metrics, visual badges, and responsive design.
15. **Enhanced Audit Trail (Task 14)**:
    -   **Advanced Filtering**: /api/audit/reports endpoint with multi-criteria filtering (userId, actionType from auditActionEnum, targetType, date range) and pagination support.
    -   **CSV Export**: Export functionality with proper parameter passing for filtered audit logs.
    -   **Audit Report Viewer**: Enhanced page with filter form, results table with color-coded action badges (create/edit/delete), drill-down details dialog, and pagination. **Bug Fix**: Corrected ACTION_TYPES to match backend auditActionEnum (e.g., 'client_edit' not 'client_update', 'trade_create' not 'order_create') to prevent filtering/export breakage.
    -   **Navigation**: Added Leaderboard to main menu (all roles), Audit Reports to management menu (admin only).
16. **Multi-Language Internationalization (i18n)**:
    -   **Translation Infrastructure**: React Context-based LanguageProvider with lazy loading, localStorage persistence, and dynamic language switching without page reload.
    -   **Supported Languages**: 15 core languages - English, Spanish, German, French, Italian, Portuguese, Russian, Chinese (Simplified), Japanese, Korean, Arabic, Turkish, Polish, Dutch, Hindi, Swedish - each with 1422+ professionally translated keys.
    -   **Translation Coverage**: 20+ pages fully internationalized including authentication (with validation/toast messages), all dashboards, client management, trading pages, calendar, transactions, user/team/role management, and affiliates.
    -   **Language Selector**: Header-integrated dropdown with flag icons and native language names for intuitive switching.
    -   **Translation System**: Namespace-based key organization (nav.*, common.*, validation.*, etc.) with fallback to English for missing translations. Validation schemas and toast messages use translation context for dynamic localization.
    -   **Architecture**: Client-side only implementation with no external translation services, using AI-generated professional translations stored in typed TypeScript files for compile-time safety.

### Data Schema
-   **Core Entities**: Users, Clients, Accounts, Subaccounts, Orders, Positions, Transactions, Roles & Permissions, Teams (with hierarchy), Audit Logs, API Keys, Market Data, Symbol Groups, Trading Symbols, Calendar Events, Email Templates, Chat Rooms, Chat Messages, Affiliates, Affiliate Referrals, Custom Statuses, KYC Questions, KYC Responses, Template Variables, Security Settings, SMTP Settings, Payment Providers, Saved Filters, Performance Targets, Achievements.
-   **Key Relationships**: Clients to Accounts (1:1), Clients to Agents/Teams, Accounts to Subaccounts (1:N), Subaccounts to Orders/Positions (1:N), Users to Roles/Teams, Chat Rooms to Chat Messages (1:N), Affiliates to Affiliate Referrals (1:N), Teams to Parent Teams (hierarchical), Clients to KYC Responses (1:N), Saved Filters to Users (N:1), Performance Targets to Users (N:1), Achievements to Users (N:1).

### Navigation Structure
The application sidebar is organized into four main sections:

1. **Main Menu**: Core operations including Dashboard, Client views (Sales/Retention/All), Global Search, Trading views (Symbols, Groups, CFD Accounts, Positions), Trading terminal, Transactions, Calendar, Sales Dashboard, Affiliates, Chat, and Leaderboard.

2. **Management**: Administrative tools including User Management, Roles & Permissions, Teams, API Keys, Import/Export Data, Audit Logs, Audit Reports, and Email Templates. Role-based access control restricts visibility to authorized users.

3. **Configuration** (Admin-only): Advanced system settings including:
   - Organizational Hierarchy (team structure and commission splits)
   - Custom Statuses (workflow status customization)
   - KYC Questions Builder (dynamic form creation)
   - Template Variables (personalization tokens)
   - Security Settings (IP whitelisting, 2FA policies)
   - SMTP Settings (email delivery configuration)
   - Payment Providers (PSP integration management)

4. **Footer**: User logout functionality.

All navigation items use role-based filtering to ensure users only see features they have permission to access.

## External Dependencies
-   **Market Data Provider**: Twelve Data (WebSocket and REST API for real-time and historical data).
-   **Database**: Neon PostgreSQL.
-   **UI Component Libraries**: Radix UI, Shadcn UI, Lucide React (icons).
-   **Development Tools**: TypeScript, Drizzle Kit, Zod, React Hook Form.
-   **Authentication**: jsonwebtoken, bcrypt.