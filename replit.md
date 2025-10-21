# Trading Platform CRM

## Overview
This enterprise-grade CRM system for a trading platform manages clients, accounts, and trading operations. It features an in-house trading engine with real-time market data, comprehensive client management, role-based access control, and audit logging. Designed as a customizable template, it supports easy replication and export for various partners and brokers. The business vision is to provide a robust, scalable, and secure platform that streamlines trading operations and client relationship management for financial institutions.

## Recent Changes

### Recurring Calendar Events - Schema Foundation (October 21, 2025)
Established database and type infrastructure for recurring calendar event functionality.

**Database Schema Updates:**
- Added `is_recurring` boolean column (default false)
- Added `recurrence_pattern` JSONB column (stores frequency, interval, daysOfWeek, endDate, count)
- Added `recurrence_exceptions` JSONB column (array of excluded date strings)
- Added `parent_event_id` self-reference column for modified instances

**Frontend Type System:**
- Extended EventFormSchema with recurring fields (isRecurring, recurrenceFrequency, recurrenceInterval, etc.)
- Created RecurrencePattern interface for type safety
- Updated CalendarEvent interface with recurring metadata fields

**Implementation Status:**
- ✅ Database schema complete
- ✅ TypeScript types and interfaces defined
- ⏳ Pending: UI for setting recurrence options
- ⏳ Pending: Backend expansion logic to generate instances from patterns
- ⏳ Pending: Calendar view updates to display recurring event instances

**Technical Foundation:**
- Supports daily, weekly, and monthly recurrence patterns
- Configurable interval (every N days/weeks/months)
- Flexible end conditions (end date or occurrence count)
- Exception tracking for deleted/modified instances
- Parent-child relationships for instance overrides

**Next Steps:** Complete MVP with basic recurrence UI, pattern storage, and simple instance expansion for calendar display.

**Impact:** Provides essential infrastructure for recurring calendar events, enabling scheduled meetings, regular client follow-ups, and automated event scheduling.

### Performance Metrics Dashboard & CSV Export (October 21, 2025)
Enhanced closed positions page with comprehensive trading analytics and export capabilities.

**Performance Metrics Dashboard:**
- **Overview Card**: Total Positions, Total Realized P/L, Net P/L (after commission), Total Commission
- **Win/Loss Analysis**: Win Rate (%), Profit Factor, Average Win, Average Loss with supporting details
- **Extremes & Stats**: Largest Win/Loss, Average Hold Time (hours/days), Risk/Reward Ratio
- **Smart Calculations**: Proper edge case handling (∞ for unbounded metrics, N/A for no data, correct timestamp counting)
- **Responsive Design**: 3-column grid layout (collapses to 1 column on mobile) with color-coded metrics

**CSV Export Feature:**
- **Export Modes**: 
  - Open Positions: Selected, Filtered, All
  - Closed Positions: Filtered, All
- **Comprehensive Data**: Includes all position details, tags (semicolon-separated), hold time calculations
- **CSV Standards**: Proper escaping of commas, quotes, and newlines
- **File Naming**: Timestamped filenames (positions_open_2025-10-21.csv)
- **User Feedback**: Success toasts with export counts, validation for empty data
- **Pure Client-Side**: No backend required, instant download using Blob API

**Technical Implementation:**
- Frontend metrics calculated from filtered positions with proper zero guards
- Hold time tracking with separate counter for positions with valid timestamps
- Risk/reward ratio displays ∞ when no losses, N/A when no trades
- All UI elements have data-testid attributes for testing
- Export dialog with mode selection and data preview

**Impact:** Traders can now analyze trading performance with professional-grade metrics and export position data for external analysis, compliance, or reporting.

### Position Tags & Categories System (October 21, 2025)
Implemented comprehensive position tagging system for organizing and categorizing trading positions with visual labels and color coding.

**Features:**
- **Tag Management UI**: Create, edit, and delete position tags with custom names, colors, and descriptions
- **Color Customization**: Choose from 12 preset colors or use custom hex colors with visual picker
- **Inline Tag Assignment**: Add/remove tags directly from position rows using command palette search
- **Visual Badges**: Tags display as colored badges in position tables for quick identification
- **Duplicate Prevention**: Backend validates and prevents duplicate tag assignments with 409 responses
- **Real-time Updates**: All tag operations trigger immediate cache invalidation and UI refresh

**Technical Implementation:**
- Database: `positionTags` table (id, name, color, description) and `positionTagAssignments` junction table
- Backend: RESTful API with CRUD endpoints (`/api/position-tags`, `/api/positions/:id/tags`)
- Frontend: `TagManagementDialog` component for tag CRUD, `PositionTags` component for assignment
- Validation: Zod schemas enforce data integrity on both frontend and backend
- Audit: All tag operations logged to audit system

**Impact:** Traders can now organize positions by strategy, risk level, client type, or any custom categories, improving portfolio management and analysis.

### P/L Calculation Fix (October 19, 2025)
Fixed critical P/L calculation errors affecting all trading positions. The system now correctly handles instrument-aware position sizing with lot-to-units conversion for forex instruments.

**Changes Made:**
- Added `getPositionUnits()` helper function in `server/config/instruments.ts` to convert forex lots to base units
- Updated P/L formulas in `updatePositionPnL()`, `closePosition()`, and `modifyPosition()` to use correct position units
- Forex positions: Quantity stored in "lots" is converted to base units (lots × lotSize = 100,000) before P/L calculation
- Other instruments (crypto, indices, commodities): Quantity used as-is
- One-time migration recalculated all existing positions (14 positions updated, $4.7M balance adjustment)

**Formula:**
- Gross P/L = priceChange × positionUnits × contractMultiplier
- For forex: positionUnits = lots × lotSize (e.g., 0.01 lots × 100,000 = 1,000 units)
- For crypto/indices: positionUnits = quantity (no conversion)

**Impact:** All P/L calculations now accurately reflect profits and losses across all instrument types.

### Symbol Format & Contract Multiplier Fix (October 19, 2025)
Fixed symbol format inconsistencies and incorrect contract multipliers that caused massive P/L errors.

**Issues Found:**
- 3 positions had symbol format `EURUSD` instead of `EUR/USD` (missing slash)
- Contract multiplier incorrectly stored as `100000` instead of `1` (confused with lot size)
- One position had garbage current price ($99.90 instead of ~$1.16) causing $493,729 P/L error

**Changes Made:**
- Corrected all symbol formats to use proper format with slashes (e.g., `EUR/USD`, `GBP/USD`)
- Fixed contract multipliers: Forex = 1 (lot size of 100,000 is handled separately in position units calculation)
- Integrated live price fetching from TwelveData API for all open positions
- Recalculated P/L with correct values

**Example Fix:**
- Position: 0.05 lots EUR/USD
- Before: Symbol=EURUSD, Multiplier=100000, Price=$99.90, P/L=$493,729.98
- After: Symbol=EUR/USD, Multiplier=1, Price=$1.16139 (live), P/L=$9.19

**Impact:** All positions now use correct symbol formats, proper contract multipliers, and live market data from TwelveData.

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
Core entities include Users, Clients, Accounts, Orders, Positions, Position Tags (with many-to-many assignments), Roles & Permissions, Teams (hierarchical), Audit Logs, Market Data, Trading Symbols, Calendar Events, Email Templates, Chat Rooms, Affiliates, Custom Statuses, KYC Questions, Template Variables, Security Settings, SMTP Settings, Payment Providers, Saved Filters, Performance Targets, and Achievements. Key relationships exist between these entities to support the CRM's functionality.

### Navigation Structure
The application sidebar is organized into Main Menu (Dashboard, Client views, Trading views, etc.), Management (User, Role, Team management, Audit Logs), and Configuration (Admin-only advanced settings like Organizational Hierarchy, Custom Statuses, KYC Questions, Security, SMTP, Payment Providers). All navigation items are role-based.

## External Dependencies
-   **Market Data Provider**: Twelve Data (WebSocket and REST API).
-   **Database**: Neon PostgreSQL.
-   **UI Component Libraries**: Radix UI, Shadcn UI, Lucide React (icons).
-   **Development Tools**: TypeScript, Drizzle Kit, Zod, React Hook Form.
-   **Authentication**: jsonwebtoken, bcrypt.