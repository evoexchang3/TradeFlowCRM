# Trading Platform Integration Guide

This document provides all necessary credentials and configuration details to integrate the **Trading Platform** with this **CRM system**.

---

## 📋 Integration Credentials Summary

| Key                          | Value / Instructions                                    | Description                                        |
| ---------------------------- | ------------------------------------------------------- | -------------------------------------------------- |
| `CRM_BASE_URL`               | `https://<your-repl-name>.<your-username>.repl.co/api` | CRM main API base URL                              |
| `CRM_SERVICE_TOKEN`          | Generate via API Keys UI (Admin only)                  | Service token for authenticated API calls          |
| `SITE_WEBHOOK_SECRET`        | Auto-generated or set via environment variable          | HMAC secret for webhook signature verification     |
| `SSO_IMPERSONATION_SECRET`   | Auto-generated or set via environment variable          | Shared secret for SSO impersonation token signing  |
| `TWELVEDATA_API_KEY`         | *(Provided by Trading Platform)*                       | Twelve Data API key for live market quotes         |

---

## 🔹 1. CRM Base URL

The CRM API is accessible at the following URL:

### Production URL
```
https://<your-repl-name>.<your-username>.repl.co/api
```

**Example:**
```
https://trading-crm-abc123.yourname.repl.co/api
```

### How to Find Your CRM Base URL
1. Open your Replit project
2. Click "Run" or "Deploy" 
3. Copy the webview URL and append `/api` to it

---

## 🔹 2. CRM Service Token (API Key)

The Trading Platform needs a service-level API token to authenticate API calls to the CRM.

### How to Generate the Service Token

1. **Login to CRM as Administrator**
   - Email: `apitwelve001@gmail.com`
   - Password: `Admin123`

2. **Navigate to API Keys page**
   - Go to Management → API Keys (or `/api-keys`)

3. **Create New API Key**
   - **Name**: `Trading Platform Service Token`
   - **Scope**: Select `admin` (for full access)
   - **IP Whitelist**: *(Optional)* Enter Trading Platform server IPs if known
   - **Expires At**: *(Optional)* Leave blank for no expiration, or set a renewal date

4. **Copy the API Key**
   - ⚠️ **IMPORTANT**: The key is shown only once!
   - Copy the full API key string (format: `crm_live_XXXXXXXX...`)
   - Store it securely in the Trading Platform's environment as `CRM_SERVICE_TOKEN`

### Using the Service Token

All API requests to the CRM must include the service token in the Authorization header:

```bash
Authorization: Bearer crm_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Example API Call:**
```bash
curl -X GET https://your-crm-url.repl.co/api/clients \
  -H "Authorization: Bearer crm_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

---

## 🔹 3. Webhook Configuration

The CRM provides a webhook endpoint for the Trading Platform to send real-time events.

### Webhook Endpoint
```
POST https://<your-crm-url>.repl.co/api/webhooks/site
```

### Webhook Secret

The webhook secret is used to verify that requests are genuinely from the Trading Platform.

#### How to Get/Set the Secret

**Option 1: Auto-Generated (Development)**
- If `SITE_WEBHOOK_SECRET` is not set, the CRM will auto-generate one on first webhook request
- Check server logs for: `⚠️ SITE_WEBHOOK_SECRET not set. Using generated secret: [SECRET]`

**Option 2: Manual (Production - Recommended)**
1. Generate a secure random secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Set the secret in both systems:
   - **CRM**: Add `SITE_WEBHOOK_SECRET=<secret>` to Replit Secrets
   - **Trading Platform**: Add `SITE_WEBHOOK_SECRET=<secret>` to environment variables

### HMAC Signature Verification

All webhook requests must include an HMAC signature in the `X-Signature` header.

**Signature Generation (Trading Platform side):**
```javascript
const crypto = require('crypto');

function signPayload(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
}

// Example usage
const payload = {
  event: 'order.placed',
  idempotencyKey: 'uuid-12345',
  occurredAt: '2025-10-13T12:00:00Z',
  user: { externalId: 'crm-123', email: 'client@example.com' },
  order: { id: 'ord_1', symbol: 'EURUSD', side: 'buy' }
};

const signature = signPayload(payload, process.env.SITE_WEBHOOK_SECRET);

fetch('https://crm-url.repl.co/api/webhooks/site', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Signature': signature
  },
  body: JSON.stringify(payload)
});
```

### Supported Event Types

The CRM webhook accepts the following event types:

```
user.created
user.updated
email.verified
kyc.status_changed
order.placed
order.modified
position.closed
liquidation
balance.updated
deposit.requested
withdrawal.requested
```

### Webhook Payload Schema

```json
{
  "event": "order.placed",
  "idempotencyKey": "uuid-v4",
  "occurredAt": "2025-10-13T12:00:00Z",
  "user": {
    "externalId": "crm-123",
    "email": "client@domain.com"
  },
  "order": {
    "id": "ord_1",
    "symbol": "EURUSD",
    "side": "buy",
    "type": "limit",
    "qty": 1.0,
    "price": 1.0950
  },
  "meta": {
    "source": "trading-site"
  }
}
```

---

## 🔹 4. SSO Impersonation Setup

SSO impersonation allows CRM administrators to securely access client accounts in the Trading Platform for support purposes.

### Endpoints

#### POST /sso/impersonate
**Description**: Generate a short-lived impersonation token (2 minutes)

**Authorization**: Requires Administrator role. The admin ID is automatically derived from the authenticated session (Bearer token).

**Request:**
```bash
POST https://crm-url.repl.co/sso/impersonate
Authorization: Bearer <ADMIN_USER_TOKEN>
Content-Type: application/json

{
  "clientId": "crm-123",
  "reason": "Client review"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 120
}
```

#### GET /sso/consume
**Description**: Exchange impersonation token for a client session

**Request:**
```bash
GET https://trading-platform-url.repl.co/sso/consume?token=<impersonation_token>
```

**Response:**
```json
{
  "success": true,
  "token": "<session_token>",
  "client": {
    "id": "crm-123",
    "email": "client@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

### SSO Impersonation Secret

#### How to Get/Set the Secret

**Option 1: Auto-Generated (Development)**
- If `SSO_IMPERSONATION_SECRET` is not set, a random secret is generated per request
- ⚠️ **Not recommended for production** - tokens won't work across server restarts

**Option 2: Manual (Production - Recommended)**
1. Generate a secure random secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Set the same secret in both systems:
   - **CRM**: Add `SSO_IMPERSONATION_SECRET=<secret>` to Replit Secrets
   - **Trading Platform**: Add `SSO_IMPERSONATION_SECRET=<secret>` to environment variables

### Security Notes
- Impersonation tokens expire after **2 minutes**
- All impersonation actions are **logged in the audit trail**
- Only **Administrator** role can generate impersonation tokens

---

## 🔹 5. Environment Configuration

### CRM System (Replit Secrets)
Add the following secrets to your Replit project:

```bash
SITE_WEBHOOK_SECRET=<64-char-hex-secret>
SSO_IMPERSONATION_SECRET=<64-char-hex-secret>
```

### Trading Platform (Environment Variables)
Add the following to your Trading Platform environment:

```bash
CRM_BASE_URL=https://your-crm-url.repl.co/api
CRM_SERVICE_TOKEN=crm_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
SITE_WEBHOOK_SECRET=<same-64-char-hex-secret-as-crm>
SSO_IMPERSONATION_SECRET=<same-64-char-hex-secret-as-crm>
TWELVEDATA_API_KEY=<your-twelve-data-api-key>
```

---

## 🔹 6. Testing the Integration

### Test Webhook Endpoint
```bash
# Generate signature
SECRET="your-webhook-secret"
PAYLOAD='{"event":"order.placed","idempotencyKey":"test-123","occurredAt":"2025-10-13T12:00:00Z","user":{"externalId":"crm-1","email":"test@example.com"},"order":{"id":"ord_1","symbol":"EURUSD","side":"buy"},"meta":{"source":"trading-site"}}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" -hex | cut -d' ' -f2)

# Send webhook
curl -X POST https://your-crm-url.repl.co/api/webhooks/site \
  -H "Content-Type: application/json" \
  -H "X-Signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

### Test SSO Impersonation
```bash
# Step 1: Generate impersonation token (as admin)
# Note: Must use admin user token, not service token
curl -X POST https://your-crm-url.repl.co/sso/impersonate \
  -H "Authorization: Bearer $ADMIN_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"clientId":"1","reason":"Testing SSO"}'

# Step 2: Consume token (in Trading Platform)
curl -X GET "https://trading-platform-url.repl.co/sso/consume?token=<token-from-step-1>"
```

---

## 🔹 7. API Rate Limits

- **Webhook Endpoint**: No rate limit (idempotency protected)
- **SSO Impersonation**: No rate limit (audit logged)
- **General API**: No rate limit currently enforced

---

## 🔹 8. Support & Audit Trail

All integration actions are logged in the CRM audit trail:
- Webhook events: `webhook_<event-type>`
- SSO impersonation: `sso_impersonate`, `sso_consume`
- API key usage: tracked via `lastUsedAt` field

**View Audit Logs**: Login as Admin → Management → Audit Logs

---

## ✅ Integration Checklist

- [ ] CRM Base URL configured in Trading Platform
- [ ] CRM Service Token generated and configured
- [ ] Webhook secret generated and set in both systems
- [ ] SSO Impersonation secret generated and set in both systems
- [ ] Webhook endpoint tested successfully
- [ ] SSO impersonation flow tested successfully
- [ ] Twelve Data API key configured in Trading Platform
- [ ] Both systems can communicate successfully

---

## 📞 Contact

For integration support or questions, contact the CRM administrator.

**Default Admin Account:**
- Email: `apitwelve001@gmail.com`
- Password: `Admin123`
