# Trading Platform Integration Credentials

## 🔐 How to Get Your Credentials

### Step 1: Contact CRM Administrator

Contact the CRM administrator to request the following credentials:

**CRM Administrator Contact:**
- Email: apitwelve001@gmail.com
- Replit Project: evo-crm

### Step 2: Credentials You Need

The CRM administrator will provide you with these **confidential** credentials:

#### 1. Database Connection String
```bash
DATABASE_URL=postgresql://[username]:[password]@[host]/[database]?sslmode=require
```
**What it's for:** Direct access to the shared PostgreSQL database  
**Security:** Keep this secret - it grants full database access  
**Where it's stored:** CRM Replit Secrets (DATABASE_URL)

#### 2. Webhook Secret
```bash
WEBHOOK_SECRET=[64-character-hex-string]
```
**What it's for:** HMAC-SHA256 signing of webhooks you send TO the CRM  
**Security:** Must be identical on both systems for signature verification  
**Where it's stored:** CRM Replit Secrets (WEBHOOK_SECRET)

---

## 📝 How CRM Admin Shares Credentials

### Method 1: Secure Environment Variable Sharing

The CRM admin can retrieve the credentials using Replit Secrets:

1. Open the CRM Replit project
2. Go to "Tools" → "Secrets"
3. Copy the values for:
   - `DATABASE_URL`
   - `WEBHOOK_SECRET`
4. Share via secure channel (encrypted email, password manager, secure messaging)

### Method 2: Command Line (For CRM Admin)

Run this command in the CRM Replit Shell to display credentials:

```bash
# Display DATABASE_URL (first 50 chars only for verification)
echo "DATABASE_URL=${DATABASE_URL:0:50}..."

# Display WEBHOOK_SECRET
echo "WEBHOOK_SECRET=$WEBHOOK_SECRET"
```

**⚠️ Security Warning:** Never commit these credentials to Git or share in plain text channels!

---

## ✅ Verification Checklist

After receiving credentials, verify you have:

- [ ] **DATABASE_URL** - PostgreSQL connection string starting with `postgresql://`
- [ ] **WEBHOOK_SECRET** - 64-character hexadecimal string
- [ ] **CRM_BASE_URL** - https://evo-crm.replit.app/api (already have)
- [ ] **CRM_SERVICE_TOKEN** - Bearer token for API calls (already have)

---

## 🧪 Test Your Credentials

### Test 1: Database Connection

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true }
});

// Test query
pool.query('SELECT COUNT(*) FROM clients', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Database connected! Client count:', res.rows[0].count);
  }
  pool.end();
});
```

### Test 2: Webhook Signature

```javascript
const crypto = require('crypto');

const payload = {
  event: 'client.registered',
  data: { email: 'test@example.com' },
  timestamp: Date.now()
};

const signature = crypto
  .createHmac('sha256', process.env.WEBHOOK_SECRET)
  .update(JSON.stringify(payload))
  .digest('hex');

console.log('✅ Webhook signature generated:', signature.substring(0, 16) + '...');
```

---

## 🔄 What If Credentials Change?

If the CRM team rotates credentials:

1. **DATABASE_URL**: Request new connection string from CRM admin
2. **WEBHOOK_SECRET**: Must be updated on BOTH systems simultaneously
3. **Update your `.env` file** with new values
4. **Restart your application**

---

## 📞 Support

**For credential issues:**
- Contact CRM Administrator: apitwelve001@gmail.com
- CRM Replit Project: evo-crm
- Integration Guide: See `TRADING_PLATFORM_INTEGRATION.md`

**Security Notice:**
- Never share credentials in public channels
- Store in environment variables, never hardcode
- Use encrypted communication when sharing
- Rotate credentials if compromised
