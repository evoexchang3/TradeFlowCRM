# Secrets and Webhooks Inventory

Complete map of all secrets, webhooks, and their storage locations.

## Secret Variables

### Application Secrets

| Secret | Type | Length | Storage Locations | Scripts That Touch |
|--------|------|--------|-------------------|-------------------|
| `SESSION_SECRET` | Stateful | 32 bytes (64 hex chars) | `.env` | `bootstrap`, `rotate-secrets` |
| `JWT_SECRET` | Stateful | 32 bytes (64 hex chars) | `.env` | `bootstrap`, `rotate-secrets` |
| `WEBHOOK_SECRET` | Stateless | 32 bytes (64 hex chars) | `.env` | `bootstrap`, `rotate-secrets` |
| `SERVICE_API_TOKEN` | Stateless | 32 bytes (64 hex chars) | `.env` | `bootstrap`, `rotate-secrets` |
| `CRM_SERVICE_TOKEN` | Stateless | 32 bytes (64 hex chars) | `.env` | `bootstrap`, `rotate-secrets` |
| `SSO_IMPERSONATION_SECRET` | Stateless | 32 bytes (64 hex chars) | `.env` | `bootstrap`, `rotate-secrets` |

### Database Secrets

| Secret | Type | Length | Storage Locations | Scripts That Touch |
|--------|------|--------|-------------------|-------------------|
| `PGPASSWORD` | Stateful | 24 bytes (48 hex chars) | `.env`, `docker-compose.yml` (env var) | `bootstrap`, `rotate-secrets` |
| `DATABASE_URL` | Derived | N/A | `.env` (computed from PGPASSWORD) | `bootstrap`, `rotate-secrets` |

### Cache Secrets

| Secret | Type | Length | Storage Locations | Scripts That Touch |
|--------|------|--------|-------------------|-------------------|
| `REDIS_PASSWORD` | Stateful | 24 bytes (48 hex chars) | `.env`, `docker-compose.yml` (env var) | `bootstrap`, `rotate-secrets` |
| `REDIS_URL` | Derived | N/A | `.env` (computed from REDIS_PASSWORD) | `bootstrap`, `rotate-secrets` |

## Webhook Endpoints

### Incoming Webhooks (CRM Receives)

| Endpoint | Method | Purpose | Signature Verification | Secret Used |
|----------|--------|---------|----------------------|-------------|
| `/api/webhooks/site` | POST | Trading Platform → CRM events | HMAC-SHA256 header `X-Webhook-Signature` | `WEBHOOK_SECRET` |

**Storage Locations:**
- Code: `server/routes.ts` (line ~105)
- Environment: `.env` (WEBHOOK_SECRET)
- Docker: `docker-compose.yml` (passed as env var to app)

**How It Works:**
1. Trading Platform sends webhook with `X-Webhook-Signature: <hmac>`
2. CRM reads raw body and `WEBHOOK_SECRET` from env
3. Computes `HMAC-SHA256(raw_body, WEBHOOK_SECRET)`
4. Compares computed signature with provided signature
5. Rejects if mismatch

### Outgoing Webhooks (CRM Sends)

Currently, the CRM does not send outgoing webhooks. If added in the future:
- Webhook URLs would be stored in `webhooks` DB table
- Signing secrets would be stored in `webhooks.secret` column
- Registration happens via API or admin UI

## Storage Locations

### Environment File (.env)

All secrets live here. Format:

```bash
SESSION_SECRET=<64_hex_chars>
JWT_SECRET=<64_hex_chars>
WEBHOOK_SECRET=<64_hex_chars>
SERVICE_API_TOKEN=<64_hex_chars>
SSO_IMPERSONATION_SECRET=<64_hex_chars>
PGPASSWORD=<48_hex_chars>
REDIS_PASSWORD=<48_hex_chars>
DATABASE_URL=postgresql://user:pass@host:port/db
REDIS_URL=redis://:pass@host:port/0
```

**Security:**
- Never committed (in `.gitignore`)
- Backed up with timestamp on changes
- Readable only by owner: `chmod 600 .env`

### Docker Compose (docker-compose.yml)

Passes secrets as environment variables to containers:

```yaml
services:
  app:
    environment:
      SESSION_SECRET: ${SESSION_SECRET}
      JWT_SECRET: ${JWT_SECRET}
      # ... etc
```

Does NOT store secret values, only references to `.env`.

### Application Code

**server/middleware/auth.ts:**
- Reads `JWT_SECRET` (actually `SESSION_SECRET`) for token signing
- Location: Line 4

**server/routes.ts:**
- Reads `WEBHOOK_SECRET` for webhook verification
- Location: Line ~105

**server/db.ts:**
- Reads `DATABASE_URL` for connection
- Location: Line 9

**server/redis.ts:**
- Reads `REDIS_URL` for connection
- Location: Line 15

### Database Tables

**No secrets stored in database** currently. 

If webhook management is added, would use:
- Table: `webhooks`
- Columns: `id`, `url`, `secret`, `events`, `is_active`

## Scripts That Manage Secrets

### scripts/bootstrap

**What it touches:**
- Generates: All application secrets, DB password, Redis password
- Writes: `.env` file
- Renders: `Caddyfile` (if domain provided)
- Backs up: Existing `.env` (if present)

**When it runs:**
- Initial provisioning
- Re-provisioning after major changes

### scripts/rotate-secrets

**What it touches:**
- Reads: Current `.env` file
- Backs up: `.env` with timestamp
- Generates: New values for selected secrets
- Updates: `.env` file with new values
- Rebuilds: Derived URLs (DATABASE_URL, REDIS_URL)
- Restarts: Affected containers

**When it runs:**
- Periodic security rotation
- After secret compromise
- When rotating DB/Redis passwords

### Bootstrap vs Rotation

| Action | Bootstrap | Rotate |
|--------|-----------|--------|
| Generate secrets | ✅ All | ✅ Selected only |
| Backup .env | ✅ If exists | ✅ Always |
| Write .env | ✅ Full file | ✅ Update only |
| Start containers | ✅ Yes | ❌ No (restarts only) |
| Run migrations | ✅ Yes | ❌ No |
| Run seed | ✅ Yes | ❌ No |

## Secret Rotation Impact

### Stateless Secrets (No User Impact)

| Secret | Impact | Required Actions |
|--------|--------|------------------|
| `WEBHOOK_SECRET` | Incoming webhooks fail until external system updated | Update Trading Platform config |
| `SERVICE_API_TOKEN` | API calls from Trading Platform fail | Update Trading Platform config |
| `CRM_SERVICE_TOKEN` | External CRM SSO calls fail | Update external CRM config |
| `SSO_IMPERSONATION_SECRET` | SSO tokens invalid | Users re-login via SSO |

### Stateful Secrets (User Impact)

| Secret | Impact | Required Actions |
|--------|--------|------------------|
| `SESSION_SECRET` | All sessions invalidated | All users logged out, must re-login |
| `JWT_SECRET` | All JWT tokens invalid | All users logged out, must re-login |
| `PGPASSWORD` | Database connection drops | Container restarts, brief downtime (~5s) |
| `REDIS_PASSWORD` | Redis connection drops | Container restarts, sessions lost |

## Audit Trail

All secret operations are logged (without showing secret values):

**Bootstrap:**
```
[INFO] Generating cryptographic secrets...
[SUCCESS] Secrets generated
[INFO] Writing .env file...
[SUCCESS] .env file written (no secrets printed)
```

**Rotation:**
```
[INFO] Rotating selected secrets...
[SUCCESS] Rotated WEBHOOK_SECRET
[WARN] JWT_SECRET rotated - all existing tokens will be invalidated
[INFO] Rotated secrets: WEBHOOK_SECRET JWT_SECRET
```

No actual secret values appear in logs or stdout.

## External Systems That Need Secrets

### Trading Platform

Needs to know:
- `WEBHOOK_SECRET` - To sign webhooks sent to CRM
- CRM's `SERVICE_API_TOKEN` - For CRM to authenticate Trading Platform API calls

**Configuration:**
On Trading Platform side, set:
```bash
CRM_WEBHOOK_SECRET=<same_as_CRM_WEBHOOK_SECRET>
CRM_SERVICE_URL=https://crm.example.com/api
```

On CRM side, set:
```bash
WEBHOOK_SECRET=<same_as_trading_platform_knows>
TRADING_PLATFORM_URL=https://platform.example.com
SERVICE_API_TOKEN=<same_as_trading_platform_uses>
```

### GitHub Actions (Optional)

If GitHub secrets sync is enabled during bootstrap:

**Synced secrets:**
- `SESSION_SECRET`
- `JWT_SECRET`
- `WEBHOOK_SECRET`
- `SERVICE_API_TOKEN`

**NOT synced (server-only):**
- `PGPASSWORD` - Internal to Docker network
- `REDIS_PASSWORD` - Internal to Docker network
- `DATABASE_URL` - Contains internal hostnames
- `REDIS_URL` - Contains internal hostnames
- `PGHOST`, `PGPORT` - Docker network internals

## Compliance & Security

### PCI-DSS Considerations

If handling payment data:
- Secrets are generated with cryptographically secure random (OpenSSL)
- Secrets never logged or displayed
- `.env` excluded from version control
- Rotation policy: Recommend 90-day rotation for stateful secrets

### Secret Strength

All secrets use `openssl rand -hex <bytes>`:
- 32 bytes = 256 bits entropy
- 24 bytes = 192 bits entropy
- Exceeds NIST recommendations (128 bits minimum)

### Backup Security

`.env.backup.*` files contain secrets. Ensure:
- Same permissions as `.env`: `chmod 600 .env.backup.*`
- Excluded from backups that go off-server
- Deleted after verification: `find . -name ".env.backup.*" -mtime +7 -delete`
