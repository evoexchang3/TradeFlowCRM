# Trading Platform CRM Integration Credentials

**Generated:** October 13, 2025  
**Status:** Ready for Production Integration

---

## 🔐 Security Tokens

These tokens must be configured in both the CRM system and the Trading Platform for secure bi-directional communication.

### CRM Environment Variables

Add these to your CRM's environment secrets:

```bash
# JWT Authentication
JWT_SECRET=21ccc9cc3606981ffacaf430c94fdc549143a61f0470995e826f49bc15e8e21a

# Webhook Signature Verification
WEBHOOK_SECRET=78c61a3b5f15221d5e6a8a84fb8276f64fd1320bfe589597167f0a1e26ceb7b9

# Service API Authentication
SERVICE_API_TOKEN=851cc194f38855d4bd3f75526dcd7defc722862c96d9a2b0bcccb8f1c170a7e3

# SSO Impersonation Token Signing
SSO_SECRET=db10818ecf764c8f11511bf3f3b99ede799d59b2f095c3d9eb2dd1ba74ab61c7

# Trading Platform URL (update with your actual URL)
TRADING_PLATFORM_URL=https://trading.yourcompany.com
```

### Trading Platform Configuration

Configure these tokens in your Trading Platform:

```bash
# For Webhook Requests to CRM
WEBHOOK_SECRET=78c61a3b5f15221d5e6a8a84fb8276f64fd1320bfe589597167f0a1e26ceb7b9

# For Service API Calls to CRM
CRM_SERVICE_TOKEN=851cc194f38855d4bd3f75526dcd7defc722862c96d9a2b0bcccb8f1c170a7e3

# For SSO Token Validation
CRM_SSO_SECRET=db10818ecf764c8f11511bf3f3b99ede799d59b2f095c3d9eb2dd1ba74ab61c7

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
const payload = JSON.stringify(webhookData);
const signature = crypto
  .createHmac('sha256', 'WEBHOOK_SECRET')
  .update(payload)
  .digest('hex');
```

---

### 2. Service API (Trading Platform → CRM)

**Base URL:** `https://73f5fe5d-efff-4f14-80d1-8f6325fd178c-00-2e9obfqhtw7bv.janeway.replit.dev/api/service`  
**Authentication:** Bearer token in `Authorization` header  
**Token:** `851cc194f38855d4bd3f75526dcd7defc722862c96d9a2b0bcccb8f1c170a7e3`

#### Available Endpoints:

**Get Client Info:**
```bash
GET /api/service/clients/:email
Authorization: Bearer 851cc194f38855d4bd3f75526dcd7defc722862c96d9a2b0bcccb8f1c170a7e3
```

**Get Account & Subaccounts:**
```bash
GET /api/service/accounts/:clientEmail
Authorization: Bearer 851cc194f38855d4bd3f75526dcd7defc722862c96d9a2b0bcccb8f1c170a7e3
```

**Update KYC Status:**
```bash
PATCH /api/service/clients/:email/kyc
Authorization: Bearer 851cc194f38855d4bd3f75526dcd7defc722862c96d9a2b0bcccb8f1c170a7e3
Content-Type: application/json

{
  "kycStatus": "approved",
  "kycNotes": "Documents verified"
}
```

**Add Client Note:**
```bash
POST /api/service/clients/:email/notes
Authorization: Bearer 851cc194f38855d4bd3f75526dcd7defc722862c96d9a2b0bcccb8f1c170a7e3
Content-Type: application/json

{
  "comment": "Client contacted regarding account verification"
}
```

**Get Client Activity:**
```bash
GET /api/service/clients/:email/activity
Authorization: Bearer 851cc194f38855d4bd3f75526dcd7defc722862c96d9a2b0bcccb8f1c170a7e3
```

---

### 3. SSO Impersonation (CRM → Trading Platform)

**Endpoint:** `POST /api/clients/:id/impersonate`  
**CRM URL:** `https://73f5fe5d-efff-4f14-80d1-8f6325fd178c-00-2e9obfqhtw7bv.janeway.replit.dev/api/clients/:id/impersonate`  
**Authentication:** Admin JWT token (CRM staff only)  
**Token Secret:** `db10818ecf764c8f11511bf3f3b99ede799d59b2f095c3d9eb2dd1ba74ab61c7`

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
const SSO_SECRET = 'db10818ecf764c8f11511bf3f3b99ede799d59b2f095c3d9eb2dd1ba74ab61c7';

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
   - Never commit secrets to version control
   - Rotate tokens every 90 days

2. **Webhook Security:**
   - Always verify HMAC signatures before processing
   - Reject requests with invalid signatures
   - Log all webhook attempts for audit trail

3. **Service API Security:**
   - Use HTTPS for all API calls
   - Validate Bearer token on every request
   - Rate limit API calls (recommended: 100 req/min)

4. **SSO Security:**
   - Tokens expire after 15 minutes
   - Log all impersonation attempts
   - Require admin role for impersonation endpoint

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
# Generate signature
PAYLOAD='{"event":"client.registered","data":{"clientId":"TEST001","email":"test@example.com","firstName":"Test","lastName":"User","phone":"+1234567890"},"timestamp":"2025-10-13T19:00:00Z"}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "78c61a3b5f15221d5e6a8a84fb8276f64fd1320bfe589597167f0a1e26ceb7b9" | awk '{print $2}')

# Send webhook
curl -X POST https://73f5fe5d-efff-4f14-80d1-8f6325fd178c-00-2e9obfqhtw7bv.janeway.replit.dev/api/webhooks/site \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

### Test Service API:
```bash
curl -X GET https://73f5fe5d-efff-4f14-80d1-8f6325fd178c-00-2e9obfqhtw7bv.janeway.replit.dev/api/service/clients/test@example.com \
  -H "Authorization: Bearer 851cc194f38855d4bd3f75526dcd7defc722862c96d9a2b0bcccb8f1c170a7e3"
```

---

## 📞 Support

For integration issues or questions:
- Review audit logs for detailed error messages
- Check webhook signature generation
- Verify all tokens are correctly configured
- Ensure HTTPS is used for all requests

---

**Document Version:** 1.0  
**Last Updated:** October 13, 2025  
**Integration Status:** ✅ Ready for Production
