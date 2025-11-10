# CRM SSO Integration Guide

This guide explains how external CRM systems can securely impersonate clients on the Trading Platform using short-lived SSO tokens.

## Overview

The Trading Platform provides three CRM-specific API endpoints that allow external CRM systems (like evo-crm.replit.app) to generate SSO tokens and log in as clients. This enables seamless client impersonation from external admin systems while maintaining full audit trails.

## Security Features

✅ **Bearer Token Authentication** - All CRM endpoints protected by `CRM_SERVICE_TOKEN`  
✅ **10-Minute Token Expiration** - SSO tokens automatically expire after 10 minutes  
✅ **Single-Use Tokens** - Each token can only be consumed once  
✅ **Comprehensive Audit Logging** - All SSO operations logged with admin ID, reason, and IP  
✅ **Database-Backed Tokens** - Tokens stored in database for validation and tracking  
✅ **IP Address Tracking** - Both generation and consumption IPs recorded  

---

## Environment Setup

### Required Environment Variable

Add to your Trading Platform `.env` file:

```bash
# CRM SSO Integration
CRM_SERVICE_TOKEN=<64-character-hex-string>
```

**Generate Token:**
```bash
openssl rand -hex 32
```

**Share with External CRM:**
The external CRM system needs this token to authenticate API calls.

---

## API Endpoints

### 1. Generate SSO Token

**Endpoint:** `POST /api/crm/sso-token`  
**Authentication:** Bearer token (CRM_SERVICE_TOKEN)  
**Purpose:** Generate a short-lived SSO token for client impersonation

#### Request

```bash
curl -X POST https://trading-platform.com/api/crm/sso-token \
  -H "Authorization: Bearer YOUR_CRM_SERVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "client-uuid-here",
    "adminId": "admin-email@example.com",
    "reason": "Customer support request #12345"
  }'
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `clientId` | string | Yes | UUID of the client to impersonate |
| `adminId` | string | Yes | Email or ID of the admin generating the token |
| `reason` | string | No | Reason for impersonation (for audit trail) |

#### Response (200 OK)

```json
{
  "success": true,
  "ssoToken": "a1b2c3d4e5f6...64-char-hex-string",
  "expiresAt": "2025-11-10T12:10:00.000Z",
  "expiresIn": 600,
  "loginUrl": "https://trading-platform.com/api/crm/sso-login?token=a1b2c3d4..."
}
```

#### Error Responses

| Status | Error | Cause |
|--------|-------|-------|
| 400 | Missing required fields: clientId, adminId | Request body missing required fields |
| 401 | Invalid CRM service token | CRM_SERVICE_TOKEN is incorrect |
| 404 | Client not found | clientId does not exist |
| 500 | CRM Service not configured | CRM_SERVICE_TOKEN not set in environment |

---

### 2. Consume SSO Token (Login)

**Endpoint:** `GET /api/crm/sso-login?token=xxx`  
**Authentication:** None (token validates itself)  
**Purpose:** Validate SSO token and redirect user to dashboard with JWT

#### Request

```bash
# Open in browser or redirect user to:
https://trading-platform.com/api/crm/sso-login?token=a1b2c3d4e5f6...
```

#### Query Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | Yes | SSO token from generate endpoint |

#### Response (302 Redirect)

Redirects to:
```
https://trading-platform.com/dashboard?token=<JWT_ACCESS_TOKEN>
```

The frontend extracts the JWT from the URL and stores it in localStorage/sessionStorage.

#### Error Responses

| Status | Error | Cause |
|--------|-------|-------|
| 400 | Missing or invalid token | Token not provided in query string |
| 401 | SSO token already used | Token has been consumed already (single-use) |
| 401 | SSO token expired | Token older than 10 minutes |
| 404 | SSO token not found | Token doesn't exist in database |
| 404 | Client not found | Client associated with token doesn't exist |

---

### 3. Get Client Info

**Endpoint:** `GET /api/crm/clients/:clientId`  
**Authentication:** Bearer token (CRM_SERVICE_TOKEN)  
**Purpose:** Retrieve client information before generating SSO token

#### Request

```bash
curl -X GET https://trading-platform.com/api/crm/clients/client-uuid-here \
  -H "Authorization: Bearer YOUR_CRM_SERVICE_TOKEN"
```

#### Response (200 OK)

```json
{
  "success": true,
  "client": {
    "id": "uuid",
    "email": "client@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "country": "US",
    "status": "active",
    "kycStatus": "approved",
    "leadSource": "organic",
    "assignedAgent": "agent-uuid",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
}
```

#### Error Responses

| Status | Error | Cause |
|--------|-------|-------|
| 401 | Invalid CRM service token | CRM_SERVICE_TOKEN is incorrect |
| 404 | Client not found | clientId does not exist |
| 500 | CRM Service not configured | CRM_SERVICE_TOKEN not set in environment |

---

## Integration Flow

### Complete SSO Flow (External CRM → Trading Platform)

```
┌─────────────────────┐
│   External CRM      │
│   Admin Dashboard   │
└──────────┬──────────┘
           │
           │ 1. Admin clicks "Login as Client"
           │
           ▼
   POST /api/crm/sso-token
   { clientId, adminId, reason }
           │
           │ 2. Returns SSO token + loginUrl
           │
           ▼
   window.open(loginUrl, '_blank')
           │
           │ 3. Browser opens new tab
           │
           ▼
   GET /api/crm/sso-login?token=xxx
           │
           │ 4. Validates token, marks as used
           │    Generates JWT for client session
           │
           ▼
   302 Redirect → /dashboard?token=<JWT>
           │
           │ 5. Frontend extracts JWT from URL
           │    Stores in localStorage
           │
           ▼
   ┌─────────────────────┐
   │ Trading Platform    │
   │ Client Dashboard    │
   │ (Logged in as       │
   │  impersonated user) │
   └─────────────────────┘
```

---

## Audit Trail

All SSO operations are logged in the `audit_logs` table:

### Token Generation Event

```json
{
  "action": "sso_token_generated",
  "targetType": "client",
  "targetId": "client-uuid",
  "details": {
    "adminId": "admin@example.com",
    "reason": "Customer support request #12345",
    "expiresAt": "2025-11-10T12:10:00.000Z"
  },
  "ipAddress": "203.0.113.10",
  "userAgent": "Mozilla/5.0...",
  "createdAt": "2025-11-10T12:00:00.000Z"
}
```

### Token Consumption Event

```json
{
  "action": "sso_impersonate_consumed",
  "targetType": "client",
  "targetId": "client-uuid",
  "details": {
    "adminId": "admin@example.com",
    "reason": "Customer support request #12345",
    "consumedAt": "2025-11-10T12:01:30.000Z"
  },
  "ipAddress": "198.51.100.42",
  "userAgent": "Mozilla/5.0...",
  "createdAt": "2025-11-10T12:01:30.000Z"
}
```

### SSO Tokens Database Table

```sql
CREATE TABLE sso_tokens (
  id VARCHAR PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  client_id VARCHAR NOT NULL REFERENCES clients(id),
  admin_id TEXT NOT NULL,  -- CRM admin ID (not FK to users)
  reason TEXT,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  used_at TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## Example Implementation (External CRM)

### Node.js Example

```javascript
// Generate SSO token and open login page
async function loginAsClient(clientId, adminEmail, reason) {
  const response = await fetch('https://trading-platform.com/api/crm/sso-token', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CRM_SERVICE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      clientId,
      adminId: adminEmail,
      reason,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  const data = await response.json();
  
  // Open login URL in new window
  window.open(data.loginUrl, '_blank');
  
  console.log('SSO token generated, expires at:', data.expiresAt);
  console.log('Token will expire in:', data.expiresIn, 'seconds');
}

// Usage
loginAsClient(
  'client-uuid-123',
  'admin@crm.example.com',
  'Customer support ticket #12345'
);
```

### Python Example

```python
import os
import webbrowser
import requests

def login_as_client(client_id: str, admin_email: str, reason: str):
    """Generate SSO token and open trading platform login page"""
    
    response = requests.post(
        'https://trading-platform.com/api/crm/sso-token',
        headers={
            'Authorization': f'Bearer {os.getenv("CRM_SERVICE_TOKEN")}',
            'Content-Type': 'application/json',
        },
        json={
            'clientId': client_id,
            'adminId': admin_email,
            'reason': reason,
        }
    )
    
    response.raise_for_status()
    data = response.json()
    
    # Open login URL in browser
    webbrowser.open(data['loginUrl'])
    
    print(f"SSO token generated, expires at: {data['expiresAt']}")
    print(f"Token will expire in: {data['expiresIn']} seconds")

# Usage
login_as_client(
    'client-uuid-123',
    'admin@crm.example.com',
    'Customer support ticket #12345'
)
```

---

## Security Best Practices

### Token Storage
- ❌ **Never store SSO tokens** - They're short-lived and single-use
- ✅ Use immediately after generation
- ✅ Open loginUrl in new window/tab directly

### Token Rotation
- `CRM_SERVICE_TOKEN` is stateless and can be rotated anytime
- External CRM systems must update their config after rotation
- No impact on existing SSO tokens (they expire in 10 minutes anyway)

### IP Tracking
- Generation IP (CRM server IP) stored during token creation
- Consumption IP (user's browser IP) stored when token is used
- Useful for detecting suspicious activity

### Error Handling
- Always check response status codes
- Handle 401 errors (expired/used tokens) gracefully
- Log all SSO operations for audit purposes

---

## Troubleshooting

### "CRM Service not configured"
**Cause:** `CRM_SERVICE_TOKEN` not set in Trading Platform environment  
**Fix:** Add `CRM_SERVICE_TOKEN` to `.env` file and restart

### "Invalid CRM service token"
**Cause:** Wrong token provided in Authorization header  
**Fix:** Verify `CRM_SERVICE_TOKEN` matches between CRM and Trading Platform

### "SSO token expired"
**Cause:** Token older than 10 minutes  
**Fix:** Generate new token - tokens are single-use and expire quickly

### "SSO token already used"
**Cause:** Token was already consumed (single-use enforcement)  
**Fix:** Generate new token - each login requires a fresh token

### "Client not found"
**Cause:** Invalid clientId provided  
**Fix:** Verify client exists using GET /api/crm/clients/:clientId first

---

## Testing

### Manual Testing

1. **Generate Token:**
   ```bash
   curl -X POST http://localhost:5000/api/crm/sso-token \
     -H "Authorization: Bearer test-token-123" \
     -H "Content-Type: application/json" \
     -d '{"clientId":"abc123","adminId":"admin@test.com","reason":"Testing"}'
   ```

2. **Use Token:**
   Open in browser: `http://localhost:5000/api/crm/sso-login?token=<TOKEN_FROM_STEP_1>`

3. **Verify:**
   - Check you're redirected to `/dashboard?token=<JWT>`
   - Verify JWT works for authenticated requests
   - Check audit logs for both events

### Integration Testing

```javascript
describe('CRM SSO Integration', () => {
  it('should generate SSO token and log in client', async () => {
    // Generate token
    const tokenRes = await fetch('/api/crm/sso-token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CRM_SERVICE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId: testClientId,
        adminId: 'test@admin.com',
        reason: 'Test',
      }),
    });
    
    expect(tokenRes.status).toBe(200);
    const { ssoToken, loginUrl } = await tokenRes.json();
    
    // Consume token
    const loginRes = await fetch(`/api/crm/sso-login?token=${ssoToken}`, {
      redirect: 'manual',
    });
    
    expect(loginRes.status).toBe(302);
    expect(loginRes.headers.get('Location')).toContain('/dashboard?token=');
  });
});
```

---

## Support

For questions or issues:
- Check audit logs in `audit_logs` table
- Check SSO token records in `sso_tokens` table
- Review server logs for detailed error messages
- Contact Trading Platform team: apitwelve001@gmail.com
