# Trading Platform Integration - Quick Start

## 🔐 Complete Credentials (Ready to Use)

All credentials are generated and ready! Copy the `.env` section below directly into your Trading Platform.

---

## 🚀 30-Second Setup

### Step 1: Add Environment Variables

**Copy this EXACTLY into your `.env` file:**

```bash
# .env file for Trading Platform

# ===== SHARED DATABASE (PROVIDED BY CRM) =====
DATABASE_URL=postgresql://neondb_owner:npg_lhwn1VNO7pmf@ep-cool-river-afkask7t.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require

# ===== WEBHOOK SECURITY (PROVIDED BY CRM) =====
WEBHOOK_SECRET=78c61a3b5f15221d5e6a8a84fb8276f64fd1320bfe589597167f0a1e26ceb7b9
CRM_WEBHOOK_URL=https://evo-crm.replit.app/api/webhooks/site

# ===== SERVICE API (PROVIDED BY CRM) =====
CRM_BASE_URL=https://evo-crm.replit.app/api
CRM_SERVICE_TOKEN=851cc194f38855d4bd3f75526dcd7defc722862c96d9a2b0bcccb8f1c170a7e3

# ===== YOUR JWT SECRETS (YOU ALREADY HAVE) =====
JWT_ACCESS_SECRET=<your-existing-secret>
JWT_REFRESH_SECRET=<your-existing-secret>
```

⚠️ **IMPORTANT:** Keep these credentials secure! Never commit to Git.

### Step 2: Install Dependencies

```bash
npm install pg
# or
yarn add pg
```

### Step 3: Test Database Connection

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true }
});

pool.query('SELECT COUNT(*) FROM clients')
  .then(res => console.log('✅ Connected! Clients:', res.rows[0].count))
  .catch(err => console.error('❌ Error:', err.message));
```

---

## 📡 Integration Architecture

```
┌─────────────────────┐
│ Trading Platform    │
└─────────────────────┘
         ↕
┌─────────────────────┐
│ Shared PostgreSQL   │ ← Both systems use SAME database
│ (CRM Database)      │
└─────────────────────┘
         ↕
┌─────────────────────┐
│   CRM System        │
└─────────────────────┘

+ Webhooks for events (deposits, KYC, etc.)
```

**Key Principle:** No data syncing needed - both systems share one database!

---

## 🔌 Core Integration Points

### 1. Read Client Data (Direct DB)
```javascript
// Get client account by email
const result = await pool.query(`
  SELECT a.* FROM accounts a
  JOIN clients c ON a.client_id = c.id
  WHERE c.email = $1
`, [clientEmail]);
```

### 2. Display Positions (Direct DB)
```javascript
// Get all open positions
const result = await pool.query(`
  SELECT * FROM positions
  WHERE account_id = $1 AND status = 'open'
`, [accountId]);
```

### 3. Open Position (Direct DB)
```javascript
// Insert new position
await pool.query(`
  INSERT INTO positions (account_id, symbol, side, quantity, open_price, current_price, status, leverage, initiator_type, initiator_id)
  VALUES ($1, $2, $3, $4, $5, $6, 'open', $7, 'client', $8)
`, [accountId, 'EUR/USD', 'buy', '10.00', '1.16028', '1.16028', 100, clientId]);
```

### 4. Send Webhook to CRM
```javascript
const crypto = require('crypto');

const payload = {
  event: 'client.registered',
  data: {
    email: 'client@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1234567890',
    dateOfBirth: '1990-01-15',
    country: 'US'
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
```

---

## 📊 Database Tables Reference

### Key Tables You'll Use

**clients** - Client information
- id, first_name, last_name, email, phone, kyc_status, etc.

**accounts** - Account balances & settings
- id, client_id, balance, real_balance, demo_balance, bonus_balance, equity, leverage

**positions** - Open/closed trades
- id, account_id, symbol, side, quantity, open_price, close_price, status, realized_pnl

**transactions** - Deposits, withdrawals, P/L
- id, account_id, type, amount, fund_type, status

---

## 🔔 Webhook Events to Send

Send these events TO the CRM:

1. **client.registered** - New client signs up
2. **deposit.completed** - Client deposits funds
3. **withdrawal.completed** - Client withdraws funds
4. **kyc.updated** - KYC status changes

**Format:**
```javascript
{
  event: 'client.registered',
  data: { /* event-specific data */ },
  timestamp: Date.now()
}
```

**Always include:** `X-Webhook-Signature` header with HMAC-SHA256 signature

---

## ✅ Testing Checklist

- [ ] Database connection works
- [ ] Can read client data from `clients` table
- [ ] Can read positions from `positions` table
- [ ] Can create new position (test trade)
- [ ] Webhook signature generates correctly
- [ ] Client registration webhook sends successfully
- [ ] Deposit webhook sends successfully
- [ ] Both systems see same data instantly

---

## 📚 Full Documentation

- **Integration Guide:** `TRADING_PLATFORM_INTEGRATION.md`
- **Credentials Guide:** `TRADING_PLATFORM_CREDENTIALS.md`
- **This Quick Start:** `TRADING_PLATFORM_QUICKSTART.md`

---

## 🆘 Support

**CRM Administrator:**
- Email: apitwelve001@gmail.com
- Project: evo-crm on Replit

**Common Issues:**
- Database connection fails → Verify DATABASE_URL is copied correctly with `?sslmode=require`
- Webhook rejected → Verify WEBHOOK_SECRET matches exactly (no extra spaces)
- Position not showing → Ensure `account_id` is correct

---

## 📋 Credentials Summary

✅ **Provided in this file:**
- `DATABASE_URL` - Shared PostgreSQL database connection
- `WEBHOOK_SECRET` - HMAC signature secret for webhooks
- `CRM_WEBHOOK_URL` - CRM webhook endpoint
- `CRM_BASE_URL` - CRM API base URL  
- `CRM_SERVICE_TOKEN` - Bearer token for API calls

⚠️ **You need to add:**
- `JWT_ACCESS_SECRET` - Your existing JWT access secret
- `JWT_REFRESH_SECRET` - Your existing JWT refresh secret

---

**Ready to integrate? All CRM credentials are included above - just copy and start! 🚀**
