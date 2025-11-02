# Bootstrap Guide

This guide explains how to provision and deploy the CRM on your own server.

## Prerequisites

- Ubuntu 20.04+ or similar Linux distribution
- Docker Engine 24+ with Compose plugin
- Domain name (optional, for HTTPS)
- GitHub CLI `gh` (optional, for secret sync)

## Quick Start

### Interactive Mode

Run the bootstrap script and follow the prompts:

```bash
./scripts/bootstrap
```

You'll be prompted for:
- Domain name (leave empty for localhost/HTTP only)
- ACME email (for Let's Encrypt certificates if using a domain)
- Database name and user
- Redis enable/disable
- GitHub secrets sync (optional)
- External service API keys (Twelve Data, Trading Platform)

### Non-Interactive Mode

Set all values via environment variables:

```bash
export DOMAIN="crm.example.com"
export ACME_EMAIL="admin@example.com"
export DB_NAME="crm"
export DB_USER="crm_user"
export ENABLE_REDIS="true"
export TWELVEDATA_API_KEY="your_key_here"
export TRADING_PLATFORM_URL="https://platform.example.com"

./scripts/bootstrap --non-interactive
```

## What the Bootstrap Does

1. **Checks Prerequisites**: Verifies Docker and Docker Compose are installed
2. **Backs Up Existing .env**: Creates `.env.backup.<timestamp>` if `.env` exists
3. **Generates Secrets**: Creates cryptographically strong secrets for:
   - `SESSION_SECRET` (32 bytes)
   - `JWT_SECRET` (32 bytes)
   - `WEBHOOK_SECRET` (32 bytes)
   - `SERVICE_API_TOKEN` (32 bytes)
   - `SSO_IMPERSONATION_SECRET` (32 bytes)
   - `PGPASSWORD` (24 bytes)
   - `REDIS_PASSWORD` (24 bytes, if enabled)
4. **Computes URLs**: Builds `DATABASE_URL` and `REDIS_URL` from credentials
5. **Writes .env**: Creates complete `.env` with zero placeholders
6. **Renders Caddyfile**: Configures reverse proxy with HTTPS (if domain provided)
7. **Starts Docker Stack**: Brings up postgres, redis, app, and caddy
8. **Waits for Health**: Polls `/health/ready` until services are healthy
9. **Runs Migrations**: Executes Drizzle migrations against the database
10. **Runs Seed**: Creates default roles, statuses, and admin user (idempotent)
11. **Registers Webhooks**: Configures webhook endpoints and secrets
12. **Syncs GitHub Secrets**: Uploads secrets to GitHub Actions (if enabled)

## Output

On success, you'll see:

```
✓ Bootstrap completed successfully!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  🌐 Your CRM is now running at: https://crm.example.com

  📊 Admin credentials: See .env file or run seed script output
  📝 View logs: docker compose logs -f
  🔍 Check health: curl https://crm.example.com/health/ready

  To rollback: Restore from .env.backup.* file

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Rollback Procedure

If something goes wrong, restore the previous `.env`:

```bash
# List backups
ls -la .env.backup.*

# Restore a backup
cp .env.backup.20240102_153045 .env

# Restart services
docker compose down
docker compose up -d
```

## Accessing the Admin Panel

1. The default admin user is created during seed:
   - **Email**: `apitwelve001@gmail.com`
   - **Password**: `Admin123`

2. Log in at your public URL
3. **Important**: Change the password immediately after first login

## Viewing Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f app

# Last 100 lines
docker compose logs --tail=100 app
```

## Checking Health

```bash
# Liveness (is process running?)
curl http://localhost/health/live

# Readiness (can serve traffic?)
curl http://localhost/health/ready
```

## Troubleshooting

### Services Not Healthy

```bash
# Check service status
docker compose ps

# View logs for failing service
docker compose logs postgres
docker compose logs redis
docker compose logs app

# Restart a specific service
docker compose restart app
```

### Database Connection Issues

```bash
# Verify DATABASE_URL is correct
docker compose exec app env | grep DATABASE_URL

# Test database connectivity
docker compose exec postgres psql -U $PGUSER -d $PGDATABASE -c "SELECT 1;"
```

### SSL Certificate Issues

```bash
# Check Caddy logs
docker compose logs caddy

# Verify DNS points to your server
dig crm.example.com

# Ensure ports 80 and 443 are open
sudo ufw status
```

## Re-running Bootstrap

Bootstrap is idempotent in prepare-only mode. To regenerate `.env` without restarting:

```bash
# Backup is automatic
./scripts/bootstrap
```

Existing containers won't be affected until you run `docker compose up -d`.
