# Environment Variables Reference

Complete list of environment variables used by the CRM system.

## Application Variables

| Variable | Purpose | Required | Default | Rotatable | Consumed By |
|----------|---------|----------|---------|-----------|-------------|
| `NODE_ENV` | Runtime environment | No | `production` | No | App |
| `PORT` | HTTP port for app | No | `5000` | No | App |
| `PUBLIC_URL` | Public-facing URL | Yes | - | No | App, Webhooks |

## Database Variables

| Variable | Purpose | Required | Default | Rotatable | Consumed By |
|----------|---------|----------|---------|-----------|-------------|
| `DATABASE_URL` | Full Postgres connection string | Yes | - | Yes (via `PGPASSWORD`) | App, Migrations |
| `PGHOST` | Postgres hostname | No | `postgres` | No | Bootstrap, App |
| `PGPORT` | Postgres port | No | `5432` | No | Bootstrap, App |
| `PGDATABASE` | Database name | No | `crm` | No | Bootstrap, Postgres |
| `PGUSER` | Database user | No | `crm_user` | No | Bootstrap, Postgres |
| `PGPASSWORD` | Database password | Yes | Generated | Yes | Postgres, App |

## Redis Variables (Optional)

| Variable | Purpose | Required | Default | Rotatable | Consumed By |
|----------|---------|----------|---------|-----------|-------------|
| `REDIS_URL` | Full Redis connection string | No | - | Yes (via `REDIS_PASSWORD`) | App |
| `REDIS_PASSWORD` | Redis auth password | No | Generated | Yes | Redis, App |

## Security Secrets

| Variable | Purpose | Required | Default | Rotatable | Consumed By |
|----------|---------|----------|---------|-----------|-------------|
| `SESSION_SECRET` | Express session signing | Yes | Generated | Yes (stateful) | App |
| `JWT_SECRET` | JWT token signing | Yes | Generated | Yes (stateful) | App |
| `WEBHOOK_SECRET` | HMAC webhook verification | Yes | Generated | Yes (stateless) | App, External |
| `SERVICE_API_TOKEN` | Trading Platform API auth | Yes | Generated | Yes (stateless) | App, External |
| `CRM_SERVICE_TOKEN` | External CRM SSO integration auth | Yes | Generated | Yes (stateless) | App, External |
| `SSO_IMPERSONATION_SECRET` | SSO token signing | Yes | Generated | Yes (stateless) | App |

## External Services

| Variable | Purpose | Required | Default | Rotatable | Consumed By |
|----------|---------|----------|---------|-----------|-------------|
| `TWELVEDATA_API_KEY` | Market data API key | No | - | No | App |
| `TWELVEDATA_WS_URL` | Market data WebSocket URL | No | `wss://ws.twelvedata.com/v1/quotes/price` | No | App |
| `TWELVEDATA_REST_URL` | Market data REST URL | No | `https://api.twelvedata.com` | No | App |
| `TRADING_PLATFORM_URL` | External trading platform URL | No | - | No | App |

## Reverse Proxy Variables

| Variable | Purpose | Required | Default | Rotatable | Consumed By |
|----------|---------|----------|---------|-----------|-------------|
| `DOMAIN` | Domain name for HTTPS | No | `localhost` | No | Caddy |
| `ADMIN_AUTH_USER` | Basic auth username | No | - | No | Caddy |
| `ADMIN_AUTH_PASS_HASH` | Bcrypt hash of admin password | No | - | No | Caddy |

## Rotation Categories

### Stateless Secrets (Safe to Rotate Anytime)
- `WEBHOOK_SECRET` - External systems must be updated with new value
- `SERVICE_API_TOKEN` - Trading Platform must be updated
- `CRM_SERVICE_TOKEN` - External CRM systems must be updated
- `SSO_IMPERSONATION_SECRET` - SSO tokens will be invalidated

### Stateful Secrets (Invalidates Sessions/Tokens)
- `SESSION_SECRET` - All user sessions will be logged out
- `JWT_SECRET` - All JWT tokens will be invalidated
- `PGPASSWORD` - Database container restarts required
- `REDIS_PASSWORD` - Redis container restart required

## Secret Generation

All secrets are generated using OpenSSL:

```bash
# 32-byte hex string (64 characters)
openssl rand -hex 32

# 24-byte hex string (48 characters)
openssl rand -hex 24
```

## Loading Variables

### Docker Compose
Automatically loads from `.env` file in project root.

### Manual Loading
```bash
set -a
source .env
set +a
```

### Application Code
```typescript
// Node.js automatically loads .env in Docker
const dbUrl = process.env.DATABASE_URL;
```

## Security Notes

1. **Never commit `.env`**: File is in `.gitignore`
2. **Backup before rotation**: `rotate-secrets` creates automatic backups
3. **Server-only variables**: Some vars (like `PGHOST`) should not be synced to GitHub
4. **GitHub Actions sync**: Only select variables are safe to sync (see bootstrap script)

## Variables NOT Safe for GitHub Sync

These are internal to the Docker network:
- `PGHOST`
- `PGPORT`
- `REDIS_HOST`
- `REDIS_PORT`
- `DATABASE_URL` (contains internal hostname)
- `REDIS_URL` (contains internal hostname)
