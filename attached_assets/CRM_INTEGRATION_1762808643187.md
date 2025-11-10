# CRM Integration Guide - SSO "Login as Client"

## Overview

This document describes how to integrate the CRM system with the trading platform to enable "Login as Client" functionality. CRM administrators can securely impersonate clients without requiring passwords, providing direct access to the client's dashboard for support and troubleshooting.

## Architecture

The SSO (Single Sign-On) flow uses short-lived, single-use tokens to authenticate CRM administrators as clients:

1. **CRM Backend** generates an SSO token by calling the trading platform API
2. **Trading Platform** validates the request and returns a login URL with the token
3. **CRM Frontend** redirects the admin's browser to the login URL
4. **Trading Platform** validates the token, logs the impersonation, and logs in the admin as the client
5. **Admin** is redirected to the client's dashboard with full access

### Security Features

- ✅ **Bearer Token Authentication**: All API calls require `CRM_SERVICE_TOKEN`
- ✅ **Short Expiration**: Tokens expire after 10 minutes
- ✅ **Single-Use**: Tokens are marked as consumed after first use
- ✅ **Audit Logging**: All impersonation events are logged with admin ID, reason, and timestamp
- ✅ **IP Tracking**: IP addresses are recorded for security auditing

## API Endpoints

### 1. Generate SSO Token

**Endpoint:** `POST /api/crm/sso-token`

**Authentication:** Bearer token (CRM_SERVICE_TOKEN)

**Request Headers:**
```http
Authorization: Bearer YOUR_CRM_SERVICE_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "clientId": "uuid-of-client",
  "adminId": "admin-user-id",
  "reason": "Customer support request #12345"
}
```

**Request Parameters:**
- `clientId` (required): UUID of the client to impersonate
- `adminId` (required): ID of the CRM admin initiating the impersonation
- `reason` (optional): Reason for impersonation (logged for audit trail)

**Response (Success - 200):**
```json
{
  "ssoToken": "a1b2c3d4e5f6...",
  "expiresAt": "2024-01-01T12:10:00.000Z",
  "loginUrl": "https://evo-trading-demo.com/api/crm/sso-login?token=a1b2c3d4e5f6..."
}
```

**Response (Error - 401):**
```json
{
  "message": "Unauthorized"
}
```

**Response (Error - 400):**
```json
{
  "message": "clientId and adminId are required"
}
```

**Response (Error - 404):**
```json
{
  "message": "Client not found"
}
```

### 2. SSO Login

**Endpoint:** `GET /api/crm/sso-login?token={token}`

**Authentication:** None (token-based)

**Query Parameters:**
- `token` (required): The SSO token received from the generate endpoint

**Response:**
- Redirects to `/dashboard?accessToken=...&refreshToken=...`
- Client is now logged in and can access their dashboard

**Error Response (400):**
```json
{
  "message": "Invalid or expired SSO token"
}
```

### 3. Get Client Info (Optional)

**Endpoint:** `GET /api/crm/clients/:clientId`

**Authentication:** Bearer token (CRM_SERVICE_TOKEN)

**Response (200):**
```json
{
  "id": "uuid",
  "email": "client@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "role": "client",
  "kycStatus": "approved",
  "emailVerified": true,
  "twoFactorEnabled": false,
  "isActive": true,
  "status": "active",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

## Implementation Guide

### Backend Implementation (CRM)

Create an endpoint in your CRM backend to handle the "Login as Client" action:

```javascript
// Example: Node.js/Express
app.post('/api/admin/impersonate-client', async (req, res) => {
  try {
    const { clientId } = req.body;
    const adminId = req.user.id; // From your CRM auth middleware

    // Call trading platform to generate SSO token
    const response = await fetch('https://evo-trading-demo.com/api/crm/sso-token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CRM_SERVICE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId,
        adminId,
        reason: `Admin impersonation via CRM`,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return res.status(response.status).json(error);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
```

### Frontend Implementation (CRM)

Add a "Login as Client" button in your CRM client detail view:

```javascript
// Example: React/JavaScript
async function handleLoginAsClient(clientId) {
  try {
    // Call your CRM backend
    const response = await fetch('/api/admin/impersonate-client', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${yourCrmToken}`,
      },
      body: JSON.stringify({ clientId }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate SSO token');
    }

    const { loginUrl } = await response.json();

    // Open trading platform in new window with SSO token
    window.open(loginUrl, '_blank');
  } catch (error) {
    console.error('Impersonation failed:', error);
    alert('Failed to login as client');
  }
}

// Usage in your UI
<button onClick={() => handleLoginAsClient(client.id)}>
  Login as Client
</button>
```

### Alternative: Direct Redirect

If you want to redirect in the same window instead of opening a new tab:

```javascript
async function handleLoginAsClient(clientId) {
  const response = await fetch('/api/admin/impersonate-client', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${yourCrmToken}`,
    },
    body: JSON.stringify({ clientId }),
  });

  const { loginUrl } = await response.json();
  
  // Redirect current window
  window.location.href = loginUrl;
}
```

## Environment Variables

You need to configure the following environment variables in your trading platform:

```bash
# Required for CRM integration
CRM_SERVICE_TOKEN=your-secure-random-token-here
WEBHOOK_SECRET=your-webhook-signature-secret-here

# Optional: CRM base URL for webhooks
CRM_BASE_URL=https://your-crm.example.com
```

### Generating Secure Tokens

Generate strong random tokens using:

```bash
# Generate CRM_SERVICE_TOKEN
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate WEBHOOK_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Supported Domains

The SSO flow works with both production domains:

- **Production:** `https://evo-trading-demo.com`
- **Staging:** `https://trading-platform.replit.app`

The `loginUrl` returned by the API will automatically use the domain from which the request was made.

## Security Considerations

### Token Security

1. **Never expose CRM_SERVICE_TOKEN** in frontend code
2. **Always make SSO token requests** from your backend
3. **Use HTTPS** for all API communications
4. **Store tokens securely** in environment variables

### Audit Logging

All impersonation events are logged with:
- **Admin ID** who initiated the impersonation
- **Client ID** being impersonated
- **Reason** for impersonation (optional, defaults to "CRM admin impersonation")
- **Admin's Browser IP Address** (actual impersonator's IP)
- **CRM Server IP Address** (stored in audit log details for reference)
- **User Agent** (browser/client information)
- **Timestamp** (when impersonation occurred)

This dual IP tracking ensures you can identify both the actual admin performing the impersonation (their browser IP) and the CRM system they used (CRM server IP), providing a complete security audit trail.

Access audit logs via the trading platform's admin panel or database:

```sql
SELECT * FROM audit_logs 
WHERE action = 'impersonation' 
ORDER BY created_at DESC;
```

### Rate Limiting

Consider implementing rate limiting in your CRM to prevent abuse:

```javascript
// Example: Limit to 10 impersonations per admin per hour
const rateLimit = require('express-rate-limit');

const impersonationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many impersonation attempts, please try again later.',
});

app.post('/api/admin/impersonate-client', impersonationLimiter, async (req, res) => {
  // Your implementation
});
```

## Testing

### Manual Testing

1. **Generate Token:**
```bash
curl -X POST https://evo-trading-demo.com/api/crm/sso-token \
  -H "Authorization: Bearer YOUR_CRM_SERVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "client-uuid-here",
    "adminId": "admin-id-here",
    "reason": "Testing SSO flow"
  }'
```

2. **Use the returned loginUrl:**
```bash
# Open in browser
https://evo-trading-demo.com/api/crm/sso-login?token=TOKEN_FROM_STEP_1
```

3. **Verify:**
- You should be redirected to `/dashboard`
- You should be logged in as the client
- Check audit logs for impersonation event

### Automated Testing

```javascript
describe('CRM SSO Integration', () => {
  it('should generate SSO token for valid client', async () => {
    const response = await fetch('/api/crm/sso-token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CRM_SERVICE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId: 'valid-client-id',
        adminId: 'admin-id',
        reason: 'Test',
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('ssoToken');
    expect(data).toHaveProperty('loginUrl');
    expect(data).toHaveProperty('expiresAt');
  });

  it('should reject invalid bearer token', async () => {
    const response = await fetch('/api/crm/sso-token', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer invalid-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId: 'valid-client-id',
        adminId: 'admin-id',
      }),
    });

    expect(response.status).toBe(401);
  });
});
```

## Troubleshooting

### Common Issues

**1. "Unauthorized" Error**
- Verify `CRM_SERVICE_TOKEN` is correctly set
- Ensure the token is sent in the `Authorization: Bearer` header
- Check that the token matches on both CRM and trading platform

**2. "Client not found" Error**
- Verify the `clientId` exists in the database
- Check that you're using the correct UUID format
- Ensure the client hasn't been deleted

**3. "Invalid or expired SSO token" Error**
- Tokens expire after 10 minutes
- Each token can only be used once
- Generate a new token if needed

**4. Redirect not working**
- Check browser console for errors
- Verify the `loginUrl` is accessible
- Ensure CORS is properly configured if using different domains

### Debug Mode

Enable debug logging in the trading platform:

```bash
# Set in environment
DEBUG=crm:*
```

This will log all CRM-related activities to help diagnose issues.

## Support

For integration support or questions:

1. Check the audit logs for detailed error information
2. Review the trading platform logs
3. Verify all environment variables are set correctly
4. Contact the platform team with specific error messages

## Changelog

### Version 1.0 (Current)
- Initial SSO implementation
- Support for client impersonation
- Audit logging
- 10-minute token expiration
- Single-use tokens
