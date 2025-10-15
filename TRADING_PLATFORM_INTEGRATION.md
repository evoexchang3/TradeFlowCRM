# Trading Platform ↔ CRM Integration Guide

## Overview

This guide explains how to integrate the Trading Platform with the CRM system using a **shared database architecture**. Both systems read and write to the same PostgreSQL database, ensuring instant synchronization without data duplication.

**CRM URL:** `https://evo-crm.replit.app`

---

## 🚀 Quick Start: Required Credentials

### What You Already Have ✅
- ✅ CRM Base URL
- ✅ CRM Service Token (Bearer token for API calls)
- ✅ JWT Access Secret
- ✅ JWT Refresh Secret

### What You Need from CRM Team 📋

#### 1. **DATABASE_URL** (Critical - Shared Database Access)
```bash
DATABASE_URL=postgresql://[username]:[password]@[host]/[database]?sslmode=require
```
**Purpose:** Direct access to shared PostgreSQL database for reading/writing positions, clients, accounts.

**Important:** This is the SAME database the CRM uses. Both systems share one database for instant sync.

**How to get:** Contact CRM admin (apitwelve001@gmail.com) - stored in CRM Replit Secrets

#### 2. **WEBHOOK_SECRET** (For Signing Webhooks to CRM)
```bash
WEBHOOK_SECRET=[64-character-hex-string]
```
**Purpose:** HMAC-SHA256 signature for webhooks you send TO the CRM (client.registered, deposit.completed, etc.)

**How to get:** Contact CRM admin (apitwelve001@gmail.com) - stored in CRM Replit Secrets

**How to Use:**
```javascript
const crypto = require('crypto');
const signature = crypto
  .createHmac('sha256', process.env.WEBHOOK_SECRET)
  .update(JSON.stringify(payload))
  .digest('hex');
```

#### 3. **Trading Platform Base URL** (For CRM Callbacks - Optional)
```bash
TRADING_PLATFORM_URL=https://your-trading-platform.com
```
**Purpose:** If CRM needs to send webhooks back to your platform (future feature).

---

### Complete Environment Variables Checklist

Add these to your Trading Platform `.env` file:

```bash
# ===== DATABASE (REQUIRED) =====
DATABASE_URL=<get-from-crm-team>

# ===== WEBHOOK INTEGRATION (REQUIRED) =====
WEBHOOK_SECRET=<get-from-crm-team>
CRM_WEBHOOK_URL=https://evo-crm.replit.app/api/webhooks/site

# ===== API INTEGRATION (YOU ALREADY HAVE) =====
CRM_BASE_URL=https://evo-crm.replit.app/api
CRM_SERVICE_TOKEN=<you-already-have-this>

# ===== JWT TOKENS (YOU ALREADY HAVE) =====
JWT_ACCESS_SECRET=<you-already-have-this>
JWT_REFRESH_SECRET=<you-already-have-this>
```

---

## Architecture Summary

```
┌─────────────────────┐         ┌─────────────────────┐
│  Trading Platform   │◄───────►│    Shared Database  │
│                     │         │   (PostgreSQL)      │
└─────────────────────┘         └─────────────────────┘
          │                               ▲
          │ Webhooks                      │
          ▼                               ▼
┌─────────────────────┐         ┌─────────────────────┐
│    CRM System       │◄────────┤  Direct DB Access   │
│                     │         │                     │
└─────────────────────┘         └─────────────────────┘
```

**Key Principles:**
- ✅ Single source of truth (shared database)
- ✅ No data duplication or syncing delays
- ✅ Webhooks only for non-position events (deposits, KYC, etc.)
- ✅ Direct database reads/writes for positions and trades

---

## 1. Database Connection Setup

### Required Environment Variables

```bash
DATABASE_URL=postgresql://[username]:[password]@[host]/[database]?sslmode=require
WEBHOOK_SECRET=[shared-secret-for-hmac-signature]
SERVICE_API_TOKEN=[shared-bearer-token]
```

**Important:** Get these exact values from the CRM team. They are documented in `INTEGRATION_CREDENTIALS.md`.

### Database Schema Version

The CRM uses **Drizzle ORM** with PostgreSQL. You can use:
- Drizzle ORM (recommended - same as CRM)
- Raw SQL queries with pg/node-postgres
- Any PostgreSQL client library

---

## 2. Database Tables & Schema

### Core Tables You'll Need

#### `clients` Table
```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  date_of_birth DATE,
  country TEXT,
  kyc_status TEXT DEFAULT 'pending', -- 'pending' | 'verified' | 'rejected'
  pipeline_status TEXT DEFAULT 'new_lead',
  agent_id UUID REFERENCES users(id),
  team_id UUID REFERENCES teams(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `accounts` Table
```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) NOT NULL,
  account_number TEXT UNIQUE NOT NULL,
  currency TEXT DEFAULT 'USD',
  
  -- Fund Type Balances
  balance DECIMAL(18,2) DEFAULT 0,           -- Total = real + demo + bonus
  real_balance DECIMAL(18,2) DEFAULT 0,      -- Withdrawable funds
  demo_balance DECIMAL(18,2) DEFAULT 0,      -- Practice funds (non-withdrawable)
  bonus_balance DECIMAL(18,2) DEFAULT 0,     -- Promotional credits (non-withdrawable)
  
  -- Trading Metrics
  equity DECIMAL(18,2) DEFAULT 0,            -- balance + unrealized P/L
  margin DECIMAL(18,2) DEFAULT 0,            -- Used margin
  free_margin DECIMAL(18,2) DEFAULT 0,       -- Available for new trades
  margin_level DECIMAL(18,2) DEFAULT 0,      -- (equity/margin) * 100
  
  leverage INTEGER DEFAULT 100,              -- 1:100, 1:200, etc.
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `positions` Table (Most Important!)
```sql
CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) NOT NULL,
  order_id UUID REFERENCES orders(id),
  
  -- Trade Details
  symbol TEXT NOT NULL,                      -- 'EUR/USD', 'GBP/USD', etc.
  side TEXT NOT NULL,                        -- 'buy' | 'sell'
  quantity DECIMAL(18,8) NOT NULL,           -- Position size
  
  -- Pricing
  open_price DECIMAL(18,8) NOT NULL,
  current_price DECIMAL(18,8) NOT NULL,      -- Updated in real-time
  close_price DECIMAL(18,8),                 -- Set when closed
  
  -- P/L
  unrealized_pnl DECIMAL(18,8),              -- For open positions
  realized_pnl DECIMAL(18,8),                -- For closed positions
  
  -- Risk Management
  stop_loss DECIMAL(18,8),
  take_profit DECIMAL(18,8),
  
  -- Meta
  leverage DECIMAL(10,2),
  spread DECIMAL(18,8),
  fees DECIMAL(18,8),
  
  status TEXT DEFAULT 'open',                -- 'open' | 'closed'
  
  -- Timestamps
  opened_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP,
  
  -- Audit Trail
  initiator_type TEXT,                       -- 'admin' | 'client'
  initiator_id UUID
);
```

#### `orders` Table (Optional - for pending orders)
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) NOT NULL,
  symbol TEXT NOT NULL,
  type TEXT NOT NULL,                        -- 'market' | 'limit' | 'stop' | 'stop_limit'
  side TEXT NOT NULL,                        -- 'buy' | 'sell'
  quantity DECIMAL(18,8) NOT NULL,
  price DECIMAL(18,8),                       -- Limit/stop price
  status TEXT DEFAULT 'pending',             -- 'pending' | 'filled' | 'cancelled'
  filled_quantity DECIMAL(18,8) DEFAULT 0,
  leverage DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `transactions` Table (For deposits/withdrawals)
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) NOT NULL,
  type TEXT NOT NULL,                        -- 'deposit' | 'withdrawal' | 'profit' | 'loss'
  amount DECIMAL(18,2) NOT NULL,
  fund_type TEXT DEFAULT 'real',             -- 'real' | 'demo' | 'bonus'
  status TEXT DEFAULT 'pending',             -- 'pending' | 'completed' | 'failed'
  reference TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 3. Client Registration Flow

### When Client Registers on Trading Platform

**Step 1:** Send webhook to CRM

```javascript
// Trading Platform code
const crypto = require('crypto');

async function notifyClientRegistration(clientData) {
  const payload = {
    event: 'client.registered',
    data: {
      email: clientData.email,
      firstName: clientData.firstName,
      lastName: clientData.lastName,
      phone: clientData.phone,
      dateOfBirth: clientData.dateOfBirth,  // 'YYYY-MM-DD'
      country: clientData.country,
      registeredAt: new Date().toISOString()
    },
    timestamp: Date.now()
  };

  const signature = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');

  await fetch('https://evo-crm.replit.app/api/webhooks/site', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature
    },
    body: JSON.stringify(payload)
  });
}
```

**Step 2:** CRM automatically creates:
- Client record in `clients` table
- Account record in `accounts` table with **$0 initial balance**
- Audit log entry

**Response:**
```json
{
  "status": "created",
  "clientId": "uuid-of-client"
}
```

---

## 4. Displaying Positions in Trading Platform

### Reading Client's Positions

```javascript
// Get client's account
const getClientAccount = async (clientEmail) => {
  const result = await db.query(`
    SELECT a.* 
    FROM accounts a
    JOIN clients c ON a.client_id = c.id
    WHERE c.email = $1
    LIMIT 1
  `, [clientEmail]);
  
  return result.rows[0];
};

// Get all open positions
const getOpenPositions = async (accountId) => {
  const result = await db.query(`
    SELECT * FROM positions
    WHERE account_id = $1 
      AND status = 'open'
    ORDER BY opened_at DESC
  `, [accountId]);
  
  return result.rows;
};

// Get closed positions (trade history)
const getClosedPositions = async (accountId) => {
  const result = await db.query(`
    SELECT * FROM positions
    WHERE account_id = $1 
      AND status = 'closed'
    ORDER BY closed_at DESC
    LIMIT 100
  `, [accountId]);
  
  return result.rows;
};
```

### Display Example

```javascript
// In your trading dashboard
app.get('/api/client/positions', async (req, res) => {
  const clientEmail = req.user.email; // From auth session
  
  const account = await getClientAccount(clientEmail);
  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }
  
  const openPositions = await getOpenPositions(account.id);
  const closedPositions = await getClosedPositions(account.id);
  
  res.json({
    account: {
      balance: account.balance,
      realBalance: account.real_balance,
      demoBalance: account.demo_balance,
      bonusBalance: account.bonus_balance,
      equity: account.equity,
      margin: account.margin,
      freeMargin: account.free_margin,
      leverage: account.leverage
    },
    openPositions,
    closedPositions
  });
});
```

---

## 5. Opening Positions from Trading Platform

### When Client Opens a Trade

```javascript
const openPosition = async (clientEmail, tradeData) => {
  // 1. Get client's account
  const account = await getClientAccount(clientEmail);
  if (!account) throw new Error('Account not found');
  
  // 2. Get market price
  const marketPrice = await getMarketPrice(tradeData.symbol);
  const openPrice = tradeData.side === 'buy' ? marketPrice.ask : marketPrice.bid;
  
  // 3. Insert position
  const result = await db.query(`
    INSERT INTO positions (
      account_id, symbol, side, quantity,
      open_price, current_price, status,
      leverage, opened_at,
      initiator_type, initiator_id
    ) VALUES (
      $1, $2, $3, $4, $5, $6, 'open', $7, NOW(), 'client', $8
    ) RETURNING *
  `, [
    account.id,
    tradeData.symbol,        // 'EUR/USD'
    tradeData.side,          // 'buy' or 'sell'
    tradeData.quantity,      // '10.00000000'
    openPrice,               // 1.16028125
    openPrice,               // Same as open price initially
    tradeData.leverage || account.leverage,
    account.client_id        // initiator_id
  ]);
  
  return result.rows[0];
};

// Usage
app.post('/api/trades/open', async (req, res) => {
  const position = await openPosition(req.user.email, {
    symbol: 'EUR/USD',
    side: 'buy',
    quantity: '10.00000000',
    leverage: 100
  });
  
  res.json(position);
});
```

**Important:** CRM will see this position immediately when they refresh!

---

## 6. Updating Positions (Real-time P/L)

### Update P/L as Market Moves

```javascript
const updatePositionPnL = async (positionId, newMarketPrice) => {
  await db.query(`
    UPDATE positions
    SET 
      current_price = $2,
      unrealized_pnl = CASE 
        WHEN side = 'buy' THEN 
          ($2 - open_price::numeric) * quantity::numeric
        WHEN side = 'sell' THEN 
          (open_price::numeric - $2) * quantity::numeric
      END
    WHERE id = $1 AND status = 'open'
  `, [positionId, newMarketPrice]);
};

// Call this whenever market data updates
wsMarketData.on('price', async (data) => {
  const { symbol, bid, ask } = data;
  
  // Get all open positions for this symbol
  const positions = await db.query(`
    SELECT id, side FROM positions
    WHERE symbol = $1 AND status = 'open'
  `, [symbol]);
  
  // Update each position
  for (const position of positions.rows) {
    const currentPrice = position.side === 'buy' ? bid : ask;
    await updatePositionPnL(position.id, currentPrice);
  }
});
```

---

## 7. Closing Positions

### When Client Closes a Trade

```javascript
const closePosition = async (positionId, clientEmail) => {
  // 1. Get position and account
  const position = await db.query(`
    SELECT p.*, a.client_id, a.real_balance, a.demo_balance, a.bonus_balance
    FROM positions p
    JOIN accounts a ON p.account_id = a.id
    JOIN clients c ON a.client_id = c.id
    WHERE p.id = $1 AND c.email = $2 AND p.status = 'open'
  `, [positionId, clientEmail]);
  
  if (position.rows.length === 0) {
    throw new Error('Position not found or already closed');
  }
  
  const pos = position.rows[0];
  
  // 2. Get current market price
  const quote = await getMarketPrice(pos.symbol);
  const closePrice = pos.side === 'buy' ? quote.bid : quote.ask;
  
  // 3. Calculate realized P/L
  const priceChange = pos.side === 'buy' 
    ? closePrice - parseFloat(pos.open_price)
    : parseFloat(pos.open_price) - closePrice;
  const realizedPnl = priceChange * parseFloat(pos.quantity);
  
  // 4. Update position status
  await db.query(`
    UPDATE positions
    SET 
      status = 'closed',
      close_price = $2,
      current_price = $2,
      realized_pnl = $3,
      closed_at = NOW()
    WHERE id = $1
  `, [positionId, closePrice, realizedPnl]);
  
  // 5. Update account balance (IMPORTANT!)
  const newRealBalance = parseFloat(pos.real_balance) + realizedPnl;
  const newTotalBalance = newRealBalance + 
                          parseFloat(pos.demo_balance) + 
                          parseFloat(pos.bonus_balance);
  
  await db.query(`
    UPDATE accounts
    SET 
      real_balance = $2,
      balance = $3
    WHERE id = $1
  `, [pos.account_id, newRealBalance, newTotalBalance]);
  
  // 6. Create transaction record
  await db.query(`
    INSERT INTO transactions (
      account_id, type, amount, fund_type, status, reference
    ) VALUES (
      $1, $2, $3, 'real', 'completed', $4
    )
  `, [
    pos.account_id,
    realizedPnl >= 0 ? 'profit' : 'loss',
    Math.abs(realizedPnl),
    `Position ${pos.symbol} closed`
  ]);
  
  return { positionId, closePrice, realizedPnl };
};

// Usage
app.post('/api/trades/:id/close', async (req, res) => {
  const result = await closePosition(req.params.id, req.user.email);
  res.json(result);
});
```

---

## 8. Webhooks to Send to CRM

### Events Trading Platform Should Send

#### Deposit Completed
```javascript
const notifyDeposit = async (clientEmail, amount, transactionId) => {
  const payload = {
    event: 'deposit.completed',
    data: {
      clientEmail,
      amount: amount.toString(),
      fundType: 'real',
      transactionId,
      completedAt: new Date().toISOString()
    },
    timestamp: Date.now()
  };

  const signature = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');

  await fetch('https://evo-crm.replit.app/api/webhooks/site', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature
    },
    body: JSON.stringify(payload)
  });
};
```

#### Withdrawal Completed
```javascript
const notifyWithdrawal = async (clientEmail, amount, transactionId) => {
  const payload = {
    event: 'withdrawal.completed',
    data: {
      clientEmail,
      amount: amount.toString(),
      transactionId,
      completedAt: new Date().toISOString()
    },
    timestamp: Date.now()
  };

  const signature = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');

  await fetch('https://evo-crm.replit.app/api/webhooks/site', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature
    },
    body: JSON.stringify(payload)
  });
};
```

#### KYC Status Updated
```javascript
const notifyKYC = async (clientEmail, kycStatus) => {
  const payload = {
    event: 'kyc.updated',
    data: {
      clientEmail,
      kycStatus, // 'pending' | 'verified' | 'rejected'
      updatedAt: new Date().toISOString()
    },
    timestamp: Date.now()
  };

  const signature = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');

  await fetch('https://evo-crm.replit.app/api/webhooks/site', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature
    },
    body: JSON.stringify(payload)
  });
};
```

**Note:** You do NOT need to send webhooks for position open/close/update - the CRM reads those directly from the database!

---

## 9. Important Business Rules

### Fund Type Management

The system supports 3 fund types:

1. **Real Funds** (`real_balance`)
   - Actual client money
   - Can be withdrawn
   - All trading P/L affects real funds

2. **Demo Funds** (`demo_balance`)
   - Practice money
   - Cannot be withdrawn
   - For testing/learning

3. **Bonus Funds** (`bonus_balance`)
   - Promotional credits
   - Cannot be withdrawn
   - May have trading restrictions

**Total Balance Formula:**
```
balance = real_balance + demo_balance + bonus_balance
```

### Withdrawal Validation

```javascript
const validateWithdrawal = async (clientEmail, amount) => {
  const account = await getClientAccount(clientEmail);
  
  if (parseFloat(account.real_balance) < amount) {
    throw new Error('Insufficient real balance for withdrawal');
  }
  
  // Proceed with withdrawal
  await db.query(`
    UPDATE accounts
    SET 
      real_balance = real_balance - $2,
      balance = real_balance + demo_balance + bonus_balance
    WHERE id = $1
  `, [account.id, amount]);
};
```

### Position Initiator Types

Always set `initiator_type` and `initiator_id`:

- `initiator_type = 'client'` → Trade opened by client on platform
- `initiator_type = 'admin'` → Trade opened by CRM admin
- `initiator_id` → ID of client or user who created it

This helps with audit trails and tracking.

---

## 10. Security & Authentication

### Webhook Signature Verification

Always verify incoming webhooks from CRM (if any future webhooks are added):

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature) {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return signature === expectedSignature;
}

app.post('/api/webhooks/crm', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  
  if (!verifyWebhookSignature(req.body, signature)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process webhook
});
```

### Database Connection Security

```javascript
// Use SSL for database connection
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true
  }
});
```

---

## 11. Testing Checklist

### Basic Integration Test

- [ ] **Client Registration**
  - Create test client on Trading Platform
  - Verify webhook sent to CRM
  - Check client exists in `clients` table
  - Check account created with $0 balance

- [ ] **Display Positions**
  - CRM admin opens trade for test client
  - Trading Platform dashboard shows the position
  - P/L displays correctly

- [ ] **Open Position**
  - Client opens trade on Trading Platform
  - Position appears in database
  - CRM can see the position immediately

- [ ] **Real-time Updates**
  - Market price changes
  - Position P/L updates automatically
  - Both systems show same P/L

- [ ] **Close Position**
  - Client closes position
  - Position status updates to 'closed'
  - Account balance updates with P/L
  - CRM sees closed position in trade history

- [ ] **Webhooks**
  - Test deposit webhook
  - Test withdrawal webhook
  - Test KYC update webhook
  - Verify HMAC signatures

---

## 12. Common Queries Reference

### Get Client Info
```sql
SELECT * FROM clients WHERE email = 'client@example.com';
```

### Get Account with All Balances
```sql
SELECT 
  a.*,
  c.email,
  c.first_name,
  c.last_name
FROM accounts a
JOIN clients c ON a.client_id = c.id
WHERE c.email = 'client@example.com';
```

### Get All Open Positions with P/L
```sql
SELECT 
  p.*,
  a.account_number,
  c.email
FROM positions p
JOIN accounts a ON p.account_id = a.id
JOIN clients c ON a.client_id = c.id
WHERE p.status = 'open'
ORDER BY p.opened_at DESC;
```

### Calculate Total Unrealized P/L for Account
```sql
SELECT 
  account_id,
  SUM(unrealized_pnl) as total_unrealized_pnl
FROM positions
WHERE status = 'open'
GROUP BY account_id;
```

### Get Trade History (Last 100)
```sql
SELECT * FROM positions
WHERE account_id = $1 
  AND status = 'closed'
ORDER BY closed_at DESC
LIMIT 100;
```

---

## 13. Environment Setup Summary

### Required Environment Variables

```bash
# Database Connection
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Security Credentials (get from CRM team)
WEBHOOK_SECRET=your-webhook-secret-here
SERVICE_API_TOKEN=your-service-token-here
```

### Required NPM Packages

```json
{
  "dependencies": {
    "pg": "^8.11.0",           // PostgreSQL client
    "crypto": "built-in",       // For HMAC signatures
    "express": "^4.18.0"        // If using Express
  }
}
```

---

## 14. Support & Troubleshooting

### Common Issues

**Issue:** Position not showing in Trading Platform
- **Solution:** Check `account_id` matches client's account in database

**Issue:** P/L calculation incorrect
- **Solution:** Verify using correct price (bid for buy, ask for sell)

**Issue:** Withdrawal fails
- **Solution:** Check `real_balance` has sufficient funds, not total `balance`

**Issue:** Webhook signature invalid
- **Solution:** Ensure using same `WEBHOOK_SECRET` as CRM

### Getting Credentials

📋 **See:** `TRADING_PLATFORM_CREDENTIALS.md` for detailed instructions on obtaining credentials.

**CRM Administrator Contact:**
- Email: apitwelve001@gmail.com
- Replit Project: evo-crm
- Login: Use admin credentials to access Replit Secrets

**Required Credentials:**
1. `DATABASE_URL` - Shared database connection string (from Replit Secrets)
2. `WEBHOOK_SECRET` - HMAC signature secret (from Replit Secrets)

### Contact

For integration support or technical questions:
- **CRM Administrator:** apitwelve001@gmail.com
- **Documentation:** See `TRADING_PLATFORM_CREDENTIALS.md` for credential access
- **Integration Guide:** This document

---

## Quick Start Checklist

1. ✅ Request `DATABASE_URL` and `WEBHOOK_SECRET` from CRM admin (see `TRADING_PLATFORM_CREDENTIALS.md`)
2. ✅ Set up database connection with SSL
3. ✅ Test reading from `clients` and `accounts` tables
4. ✅ Implement client registration webhook sender
5. ✅ Implement position display (read from `positions` table)
6. ✅ Implement open position (write to `positions` table)
7. ✅ Implement real-time P/L updates
8. ✅ Implement close position (update `positions` and `accounts`)
9. ✅ Implement deposit/withdrawal/KYC webhooks
10. ✅ Test end-to-end with CRM team

---

**This shared database approach ensures both systems are always in perfect sync with zero latency! 🚀**
