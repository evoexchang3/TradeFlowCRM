# Design Guidelines: Enterprise Trading Platform CRM

## Design Approach: Data-Focused Enterprise System

**Selected Framework:** Carbon Design System (IBM) with Trading Platform Enhancements

**Rationale:** This is a data-intensive, mission-critical trading and client management system requiring exceptional clarity, performance, and professional credibility. Carbon's enterprise-grade patterns combined with established fintech UI principles (TradingView, Bloomberg Terminal, Interactive Brokers) will deliver the optimal balance of functionality and usability.

**Core Principles:**
- Data clarity over decoration
- Speed and efficiency in every interaction
- Professional, trustworthy aesthetic
- Minimal cognitive load during high-stakes trading
- Consistent, predictable patterns across all views

---

## Color System

### Dark Mode (Primary Interface)
**Background Palette:**
- Primary surface: `222 22% 12%` (deep charcoal)
- Secondary surface: `222 20% 16%` (elevated panels)
- Tertiary surface: `222 18% 20%` (cards, modals)
- Borders: `222 15% 28%` (subtle separation)

**Brand & Accent Colors:**
- Primary brand: `220 85% 55%` (professional blue for CTAs, links)
- Success/Long: `142 76% 45%` (trading green for profits, buy orders)
- Danger/Short: `0 72% 55%` (trading red for losses, sell orders)
- Warning: `38 92% 50%` (amber for pending states, warnings)
- Info: `199 89% 48%` (cyan for informational highlights)

**Typography Colors:**
- Primary text: `220 15% 92%` (high contrast white)
- Secondary text: `220 10% 65%` (muted for labels)
- Disabled text: `220 8% 45%` (low priority)

### Light Mode (Optional, User Preference)
- Background: `220 20% 97%`
- Surfaces: `0 0% 100%`
- Text: `222 22% 12%`
- Maintain same accent colors with adjusted opacity for readability

---

## Typography

**Font Families:**
- Primary: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` (UI elements, body text)
- Monospace: `'JetBrains Mono', 'Fira Code', 'Consolas', monospace` (numeric data, trading prices, account IDs)

**Type Scale:**
- Display: 2.5rem / 600 weight (dashboard headers)
- H1: 2rem / 600 weight (page titles)
- H2: 1.5rem / 600 weight (section headers)
- H3: 1.25rem / 500 weight (card headers)
- Body: 0.875rem / 400 weight (primary content)
- Caption: 0.75rem / 400 weight (metadata, timestamps)
- Trading Data: 0.875rem / 500 weight / monospace (prices, P/L, balances)

---

## Layout System

**Spacing Primitives:** Tailwind units of 1, 2, 4, 6, 8, 12, 16, 24
- Micro spacing (within components): 1, 2, 4
- Component padding: 4, 6, 8
- Section spacing: 12, 16, 24
- Page margins: 6, 8

**Grid Structure:**
- Sidebar: Fixed 280px (navigation, filters)
- Main content: Flexible `flex-1` with `max-w-[1600px]` constraint
- Data tables: Full-width with horizontal scroll on overflow
- Dashboard cards: 12-column grid, responsive breakpoints

**Container Strategy:**
- Full-width data views (trading terminal, client lists)
- Constrained forms and detail panels (`max-w-4xl`)
- Sidebar-main layout pattern for primary navigation

---

## Component Library

### Navigation & Structure
- **Top Bar:** Fixed header with logo, global search, user menu, notifications (h-16, border-b)
- **Side Navigation:** Fixed sidebar with collapsible sections, role-based menu items, active state indicators
- **Breadcrumbs:** Path navigation for deep hierarchies (text-sm, text-secondary)
- **Tabs:** Segmented controls for view switching (underline style, smooth transitions)

### Data Display
- **Trading Cards:** Live position cards with P/L, charts mini-preview, quick actions (bg-surface-secondary, rounded-lg, p-4)
- **Data Tables:** Dense tables with fixed headers, sortable columns, row actions, zebra striping (hover: bg-surface-tertiary)
- **Stat Blocks:** Key metrics display (total balance, equity, margin level) - large numbers, labels, trend indicators
- **Charts:** TradingView-style candlestick charts with dark grid, clear price levels, TP/SL markers
- **Timeline:** Audit log display with timestamps, user avatars, action descriptions

### Forms & Input
- **Input Fields:** Dark backgrounds (`bg-222-20-16`), subtle borders, clear focus states (ring-2 ring-primary)
- **Dropdowns:** Native select styling with custom arrow, searchable for long lists
- **Date Pickers:** Calendar overlay with range selection
- **Toggle Switches:** For boolean settings (Enabled/Disabled states)
- **File Upload:** Drag-and-drop zones for CSV import and document uploads

### Actions & Feedback
- **Primary Buttons:** Filled style (`bg-primary`, `text-white`, `px-6 py-2.5`, rounded)
- **Secondary Buttons:** Outline style (`border-2 border-primary`, `text-primary`)
- **Danger Actions:** Red filled for destructive operations (close position, delete client)
- **Icon Buttons:** Square (p-2), icon-only for tables and toolbars
- **Modals:** Centered overlay with backdrop blur, clear header/body/footer structure
- **Toast Notifications:** Top-right position, auto-dismiss, color-coded by type
- **Loading States:** Skeleton screens for tables, spinner for actions

### Trading-Specific Components
- **Order Entry Panel:** Quick trade form with symbol selector, quantity/price inputs, TP/SL fields, order type toggles
- **Position Manager:** Table with live P/L, modify/close actions, batch close controls
- **Price Ticker:** Scrolling tape of live prices (top bar or dedicated panel)
- **Market Depth:** Bid/ask ladder display (optional advanced view)
- **Trade Execution Confirmation:** Modal with order summary, warning states for margin calls

### Client Management
- **Client Profile Card:** Avatar, name, account ID, KYC status badge, balance overview, quick actions
- **Activity Feed:** Chronological list of deposits, trades, edits with timestamps
- **Document Viewer:** Inline PDF/image preview for KYC documents
- **Impersonation Button:** Prominent "Login as Client" with permission check and confirmation modal

### Role & Permission UI
- **Role Builder:** Drag-and-drop permission matrix, visual grouping of related permissions
- **Data Masking Indicators:** Visual cues (blur/asterisks) for masked PII based on role
- **Team Assignment:** Multi-select dropdown with team hierarchy visualization

---

## Interaction Patterns

**No Distracting Animations:** Trading requires focus. Use only subtle, functional motion:
- Tab transitions: 150ms ease
- Modal entrance: 200ms fade + slight scale
- Hover states: Instant background color change
- Chart updates: Smooth price line interpolation

**Micro-interactions:**
- Button press: subtle scale (transform: scale(0.98))
- Success actions: green checkmark fade-in
- Error states: red shake animation (very subtle)

**Keyboard Shortcuts:**
- Global search: `/`
- Quick trade entry: `T`
- Escape to close modals
- Arrow navigation in tables

---

## Accessibility & Dark Mode

- **Contrast:** All text meets WCAG AA (4.5:1 for body, 3:1 for large text)
- **Focus Indicators:** Clear 2px ring on all interactive elements
- **Screen Readers:** Proper ARIA labels for trading data, table headers, live price updates
- **Dark Mode:** Default for reduced eye strain during long trading sessions; light mode toggle in settings

---

## Data Visualization

**Chart Style (TradingView-inspired):**
- Dark backgrounds with subtle grid
- Green candles (up), red candles (down)
- Clear price axis, time axis
- TP/SL lines with labels
- Entry/exit markers
- Volume bars below (optional)

**Dashboard Metrics:**
- Large, monospace numbers for balances
- Trend sparklines for equity over time
- Color-coded P/L (green positive, red negative, gray neutral)
- Percentage change indicators with arrows

---

## Responsive Behavior

**Desktop (≥1280px):** Full sidebar, multi-column dashboards, side-by-side detail panels
**Tablet (768-1279px):** Collapsible sidebar, stacked cards, horizontal scroll tables
**Mobile (≤767px):** Bottom navigation, single column, simplified trade entry, essential data only

---

## Images & Iconography

**Icons:** Heroicons (outline for navigation/secondary actions, solid for primary buttons)
**Avatars:** Client profile images (40px circular, fallback to initials)
**Charts:** No decorative images - all functional data visualizations
**Empty States:** Simple icon + message (no illustrations)

**No Hero Images:** This is a utility application, not a marketing site. Focus on data density and functional UI from the first screen.