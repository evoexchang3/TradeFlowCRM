# Trading Platform CRM Integration Credentials

**Generated:** October 13, 2025  
**Status:** Ready for Production Integration

---

## 🔐 Security Tokens Setup

⚠️ **IMPORTANT: All tokens must be configured securely via environment variables. Never commit actual secret values to version control.**

### Step 1: Generate Your Tokens

Use one of these methods to generate cryptographically secure tokens:

**Option A - Using Node.js:**
```bash
node -e "const crypto = require('crypto'); \
  console.log('JWT_SECRET=' + crypto.randomBytes(32).toString('hex')); \
  console.log('WEBHOOK_SECRET=' + crypto.randomBytes(32).toString('hex')); \
  console.log('SERVICE_API_TOKEN=' + crypto.randomBytes(32).toString('hex')); \
  console.log('SSO_SECRET=' + crypto.randomBytes(32).toString('hex'));"
```

**Option B - Using OpenSSL:**
```bash
echo "JWT_SECRET=$(openssl rand -hex 32)"
echo "WEBHOOK_SECRET=$(openssl rand -hex 32)"
echo "SERVICE_API_TOKEN=$(openssl rand -hex 32)"
echo "SSO_SECRET=$(openssl rand -hex 32)"
```

**Option C - Using Online Generator:**
Visit https://www.random.org/strings/ and generate 4 strings with:
- Length: 64 characters
- Character set: Hexadecimal (0-9, a-f)

### Step 2: Configure CRM Environment Secrets

Add these to your CRM's secure environment configuration (Replit Secrets, .env file, or cloud secrets manager):

```bash
# JWT Authentication
JWT_SECRET=<your-generated-jwt-secret>

# Webhook Signature Verification
WEBHOOK_SECRET=<your-generated-webhook-secret>

# Service API Authentication
SERVICE_API_TOKEN=<your-generated-service-api-token>

# SSO Impersonation Token Signing
SSO_SECRET=<your-generated-sso-secret>

# Trading Platform URL
TRADING_PLATFORM_URL=https://trading.yourcompany.com
```

### Step 3: Configure Trading Platform

Share these tokens with your Trading Platform team **via secure channel** (encrypted email, password manager, secure file transfer):

```bash
# For Webhook Requests to CRM
WEBHOOK_SECRET=<same-as-crm-webhook-secret>

# For Service API Calls to CRM
CRM_SERVICE_TOKEN=<same-as-crm-service-api-token>

# For SSO Token Validation
CRM_SSO_SECRET=<same-as-crm-sso-secret>

# CRM Base URL
CRM_BASE_URL=https://73f5fe5d-efff-4f14-80d1-8f6325fd178c-00-2e9obfqhtw7bv.janeway.replit.dev
```

---

## 📡 Integration Endpoints

### 1. Webhook Receiver (Trading Platform → CRM)

**Endpoint:** `POST /api/webhooks/site`  
**CRM URL:** `https://73f5fe5d-efff-4f14-80d1-8f6325fd178c-00-2e9obfqhtw7bv.janeway.replit.dev/api/webhooks/site`

**Authentication:** HMAC-SHA256 signature in `x-webhook-signature` header

**Supported Events:**
- `client.registered` - New client registered on Trading Platform
- `deposit.completed` - Client deposit processed
- `withdrawal.completed` - Client withdrawal processed
- `kyc.updated` - KYC status changed
- `account.updated` - Account settings changed

**Example Request:**
```bash
curl -X POST https://73f5fe5d-efff-4f14-80d1-8f6325fd178c-00-2e9obfqhtw7bv.janeway.replit.dev/api/webhooks/site \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: <hmac-sha256-signature>" \
  -d '{
    "event": "client.registered",
    "data": {
      "clientId": "TP12345",
      "email": "client@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890"
    },
    "timestamp": "2025-10-13T19:00:00Z"
  }'
```

**Signature Generation (Node.js):**
```javascript
const crypto = require('crypto');
const webhookSecret = process.env.WEBHOOK_SECRET; // Load from secure config
const payload = JSON.stringify(webhookData);
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(payload)
  .digest('hex');
```

**Signature Generation (Shell/Testing):**
```bash
PAYLOAD='{"event":"client.registered",...}'
WEBHOOK_SECRET='<your-webhook-secret>'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | awk '{print $2}')
```

---

### 2. Service API (Trading Platform → CRM)

**Base URL:** `https://73f5fe5d-efff-4f14-80d1-8f6325fd178c-00-2e9obfqhtw7bv.janeway.replit.dev/api/service`  
**Authentication:** Bearer token in `Authorization` header  

#### Available Endpoints:

**Get Client Info:**
```bash
GET /api/service/clients/:email
Authorization: Bearer <SERVICE_API_TOKEN>
```

**Get Account & Subaccounts:**
```bash
GET /api/service/accounts/:clientEmail
Authorization: Bearer <SERVICE_API_TOKEN>
```

**Update KYC Status:**
```bash
PATCH /api/service/clients/:email/kyc
Authorization: Bearer <SERVICE_API_TOKEN>
Content-Type: application/json

{
  "kycStatus": "approved",
  "kycNotes": "Documents verified"
}
```

**Add Client Note:**
```bash
POST /api/service/clients/:email/notes
Authorization: Bearer <SERVICE_API_TOKEN>
Content-Type: application/json

{
  "comment": "Client contacted regarding account verification"
}
```

**Get Client Activity:**
```bash
GET /api/service/clients/:email/activity
Authorization: Bearer <SERVICE_API_TOKEN>
```

---

### 3. SSO Impersonation (CRM → Trading Platform)

**Endpoint:** `POST /api/clients/:id/impersonate`  
**CRM URL:** `https://73f5fe5d-efff-4f14-80d1-8f6325fd178c-00-2e9obfqhtw7bv.janeway.replit.dev/api/clients/:id/impersonate`  
**Authentication:** Admin JWT token (CRM staff only)  

**Response:**
```json
{
  "ssoToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "ssoUrl": "https://trading.yourcompany.com/sso/impersonate?token=...",
  "expiresIn": 900
}
```

**Trading Platform Implementation:**

Your Trading Platform should validate SSO tokens at `/sso/impersonate`:

```javascript
const jwt = require('jsonwebtoken');
const SSO_SECRET = process.env.CRM_SSO_SECRET; // Load from secure config

app.get('/sso/impersonate', (req, res) => {
  const token = req.query.token;
  
  try {
    const payload = jwt.verify(token, SSO_SECRET);
    // payload contains: { clientEmail, impersonatedBy, iat, exp }
    
    // Create session for client
    req.session.clientEmail = payload.clientEmail;
    req.session.impersonation = true;
    req.session.impersonatedBy = payload.impersonatedBy;
    
    // Redirect to client dashboard
    res.redirect('/dashboard');
  } catch (error) {
    res.status(401).send('Invalid or expired SSO token');
  }
});
```

---

## 🔒 Security Best Practices

1. **Token Storage:**
   - Store all secrets in secure environment variables
   - Use secrets management systems (Replit Secrets, AWS Secrets Manager, etc.)
   - **Never commit secrets to version control**
   - Rotate tokens every 90 days

2. **Token Sharing:**
   - Share secrets via secure channels only (encrypted email, password manager)
   - Never send secrets via Slack, regular email, or messaging apps
   - Use one-time secret sharing services if needed

3. **Webhook Security:**
   - Always verify HMAC signatures before processing
   - Reject requests with invalid signatures
   - Log all webhook attempts for audit trail
   - Use HTTPS only

4. **Service API Security:**
   - Use HTTPS for all API calls
   - Validate Bearer token on every request
   - Rate limit API calls (recommended: 100 req/min)
   - Monitor for suspicious activity

5. **SSO Security:**
   - Tokens expire after 15 minutes
   - Log all impersonation attempts
   - Require admin role for impersonation endpoint
   - Verify token signatures

---

## 📊 Audit Logging

All integration activities are automatically logged in the CRM:

- Webhook events received and processed
- Service API calls made by Trading Platform
- SSO impersonation sessions initiated
- All authentication attempts (success/failure)

Access audit logs at: **CRM Dashboard → Audit Logs**

---

## 🧪 Testing Integration

### Test Webhook (Development):
```bash
# 1. Set your webhook secret
WEBHOOK_SECRET="<your-generated-webhook-secret>"

# 2. Create test payload
PAYLOAD='{"event":"client.registered","data":{"clientId":"TEST001","email":"test@example.com","firstName":"Test","lastName":"User","phone":"+1234567890"},"timestamp":"2025-10-13T19:00:00Z"}'

# 3. Generate signature
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | awk '{print $2}')

# 4. Send webhook
curl -X POST https://73f5fe5d-efff-4f14-80d1-8f6325fd178c-00-2e9obfqhtw7bv.janeway.replit.dev/api/webhooks/site \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

### Test Service API:
```bash
SERVICE_TOKEN="<your-generated-service-api-token>"

curl -X GET https://73f5fe5d-efff-4f14-80d1-8f6325fd178c-00-2e9obfqhtw7bv.janeway.replit.dev/api/service/clients/test@example.com \
  -H "Authorization: Bearer $SERVICE_TOKEN"
```

---

## 💰 Balance Management API (Admin-Only)

### Overview
The CRM supports a multi-fund type system with three distinct fund types per account:
- **Real Funds** - Actual client money, withdrawable
- **Demo Funds** - Practice/training balance, non-withdrawable  
- **Bonus Funds** - Promotional credits, non-withdrawable

**Important:** Only real funds can be withdrawn. The `withdrawal.completed` webhook automatically validates sufficient real balance before processing.

### 4. Adjust Account Balance

**Endpoint:** `POST /api/accounts/:id/adjust-balance`  
**Authentication:** JWT (Admin role required)  
**Authorization:** Administrator role only

Adjusts a specific fund type balance (real, demo, or bonus) for an account.

**Request Body:**
```json
{
  "amount": "100.00",         // String: Positive = credit, Negative = debit
  "fundType": "real",         // Enum: "real" | "demo" | "bonus"
  "notes": "Initial deposit"  // Optional: Reason for adjustment
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "realBalance": "100.00",
  "demoBalance": "0.00",
  "bonusBalance": "0.00",
  "balance": "100.00",
  "leverage": 100,
  "currency": "USD",
  "equity": "100.00",
  "margin": "0.00",
  "marginLevel": "0.00",
  "clientId": "client-uuid"
}
```

**Example Usage:**
```bash
# Credit $100 to real balance
curl -X POST https://73f5fe5d-efff-4f14-80d1-8f6325fd178c-00-2e9obfqhtw7bv.janeway.replit.dev/api/accounts/550e8400-e29b-41d4-a716-446655440000/adjust-balance \
  -H "Authorization: Bearer <admin-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "100.00",
    "fundType": "real",
    "notes": "Client deposit via wire transfer"
  }'

# Add $500 demo balance for training
curl -X POST https://73f5fe5d-efff-4f14-80d1-8f6325fd178c-00-2e9obfqhtw7bv.janeway.replit.dev/api/accounts/550e8400-e29b-41d4-a716-446655440000/adjust-balance \
  -H "Authorization: Bearer <admin-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "500.00",
    "fundType": "demo",
    "notes": "Demo account setup for new trader training"
  }'

# Deduct $50 from real balance
curl -X POST https://73f5fe5d-efff-4f14-80d1-8f6325fd178c-00-2e9obfqhtw7bv.janeway.replit.dev/api/accounts/550e8400-e29b-41d4-a716-446655440000/adjust-balance \
  -H "Authorization: Bearer <admin-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "-50.00",
    "fundType": "real",
    "notes": "Fee deduction"
  }'
```

### 5. Update Account Leverage

**Endpoint:** `PATCH /api/accounts/:id/leverage`  
**Authentication:** JWT (Admin role required)  
**Authorization:** Administrator role only

Updates the trading leverage for an account.

**Request Body:**
```json
{
  "leverage": 100  // Number: 1-500 (common: 1, 10, 20, 50, 100, 200, 500)
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "leverage": 100,
  "balance": "1000.00",
  "realBalance": "1000.00",
  "demoBalance": "0.00",
  "bonusBalance": "0.00",
  "currency": "USD",
  "clientId": "client-uuid"
}
```

**Example Usage:**
```bash
# Set leverage to 1:100
curl -X PATCH https://73f5fe5d-efff-4f14-80d1-8f6325fd178c-00-2e9obfqhtw7bv.janeway.replit.dev/api/accounts/550e8400-e29b-41d4-a716-446655440000/leverage \
  -H "Authorization: Bearer <admin-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "leverage": 100
  }'
```

### Withdrawal Validation Business Logic

When the Trading Platform sends a `withdrawal.completed` webhook:

1. **Validation:** CRM checks `account.realBalance >= withdrawalAmount`
2. **Success Case:** 
   - Deducts from `realBalance` only
   - Recalculates `balance = realBalance + demoBalance + bonusBalance`
   - Returns `200 OK` with `{ status: "processed" }`
   - Logs operation in audit trail

3. **Failure Case (Insufficient Real Funds):**
   - Returns `400 Bad Request` with:
     ```json
     {
       "error": "Insufficient real funds for withdrawal",
       "required": 500.00,
       "available": 250.00
     }
     ```
   - Logs failed attempt in audit trail
   - No balance changes occur

**Example:**
- Account has: Real=$100, Demo=$500, Bonus=$200 (Total=$800)
- Withdrawal request: $150
- Result: **BLOCKED** - Only $100 real funds available
- Demo and bonus funds ($700) cannot be withdrawn

---

## 🔄 Token Rotation Procedure

When rotating tokens (recommended every 90 days):

1. Generate new tokens using the methods above
2. Update CRM environment secrets with new values
3. Coordinate with Trading Platform team to update their configuration
4. **Rolling update approach:**
   - Deploy new tokens to CRM
   - Wait for Trading Platform to update
   - Monitor logs for authentication failures
5. Verify all integrations working with new tokens
6. Securely delete old tokens from all systems

---

## 📞 Support

For integration issues or questions:
- Review audit logs for detailed error messages
- Check webhook signature generation
- Verify all tokens are correctly configured in environment
- Ensure HTTPS is used for all requests
- Confirm tokens match between CRM and Trading Platform

---

## 📋 Pre-Production Checklist

Before going live, verify:

- [ ] All 4 secrets generated using secure random method
- [ ] Secrets configured in CRM environment (not hardcoded)
- [ ] Secrets shared with Trading Platform team via secure channel
- [ ] Trading Platform configured with matching secrets
- [ ] TRADING_PLATFORM_URL configured correctly
- [ ] Webhook endpoint tested with valid signature
- [ ] Service API tested with Bearer token
- [ ] SSO impersonation tested end-to-end
- [ ] Audit logs capturing all integration events
- [ ] Token rotation schedule established (90 days)
- [ ] Security team review completed
- [ ] Secrets documented in password manager

---

**Document Version:** 1.0  
**Last Updated:** October 13, 2025  
**Integration Status:** ✅ Ready for Production (after secrets configured)
