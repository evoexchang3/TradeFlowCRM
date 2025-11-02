# Quick Start Guide

Get your CRM running in under 5 minutes.

## Prerequisites Check

```bash
# Verify Docker is installed
docker --version
# Required: Docker version 24.0+

# Verify Docker Compose is available
docker compose version
# Required: Docker Compose version v2.20+
```

## Installation

### Step 1: Clone Repository

```bash
git clone <your-repository-url>
cd trading-platform-crm
```

### Step 2: Run Bootstrap

```bash
./scripts/bootstrap
```

### Step 3: Answer Prompts

```
Domain name (leave empty for localhost): crm.yourdomain.com
ACME email for Let's Encrypt: admin@yourdomain.com
Database name [crm]: [press Enter]
Database user [crm_user]: [press Enter]
Enable Redis? (y/n): y
Twelve Data API key (optional): [your-key or press Enter]
Trading Platform URL (optional): https://platform.yourdomain.com
```

### Step 4: Wait for Completion

Bootstrap will:
1. Generate cryptographic secrets ✓
2. Create .env file ✓
3. Start Docker containers ✓
4. Wait for health checks ✓
5. Run database migrations ✓
6. Seed initial data ✓

Expected output:
```
✓ Bootstrap completed successfully!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  🌐 Your CRM is now running at: https://crm.yourdomain.com

  📊 Admin credentials: See .env file or run seed script output
  📝 View logs: docker compose logs -f
  🔍 Check health: curl https://crm.yourdomain.com/health/ready

  To rollback: Restore from .env.backup.* file

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## First Login

1. Navigate to your CRM URL: `https://crm.yourdomain.com`
2. Log in with default credentials:
   - **Email**: `apitwelve001@gmail.com`
   - **Password**: `Admin123`
3. **Important**: Change your password immediately!

## Verify Installation

```bash
# Check all containers are healthy
docker compose ps

# Expected output:
# NAME          STATUS                    HEALTH
# crm-app       Up 2 minutes             healthy
# crm-caddy     Up 2 minutes
# crm-postgres  Up 2 minutes             healthy
# crm-redis     Up 2 minutes (optional)

# Quick health check
./scripts/health-check

# Expected output:
# ✅ Health check complete
```

## Common Scenarios

### Scenario A: Production with Domain

```bash
./scripts/bootstrap
# Answer: crm.example.com for domain
# Answer: admin@example.com for email
# Result: HTTPS enabled automatically
```

### Scenario B: Development/Staging without Domain

```bash
./scripts/bootstrap
# Answer: [press Enter] for domain (leave empty)
# Result: HTTP only on server IP
```

### Scenario C: No Redis (Minimal Setup)

```bash
./scripts/bootstrap
# Answer: n when asked about Redis
# Result: Sessions use in-memory store
```

### Scenario D: Non-Interactive (CI/CD)

```bash
export DOMAIN="crm.example.com"
export ACME_EMAIL="admin@example.com"
export ENABLE_REDIS="true"
./scripts/bootstrap --non-interactive
```

## Next Steps

- **Operations**: See [DEPLOYMENT.md](DEPLOYMENT.md) for backups, scaling, monitoring
- **Security**: Run `./scripts/rotate-secrets` to rotate secrets
- **CI/CD**: See [DEPLOYMENT.md#cicd-setup](DEPLOYMENT.md#cicd-setup) for GitHub Actions
- **Troubleshooting**: See [BOOTSTRAP.md#troubleshooting](BOOTSTRAP.md#troubleshooting)

## Useful Commands

```bash
# View logs
docker compose logs -f

# Check health
curl http://localhost/health/ready

# Restart a service
docker compose restart app

# Stop everything
docker compose down

# Start everything
docker compose up -d
```

## Getting Help

1. Check [BOOTSTRAP.md](BOOTSTRAP.md) for detailed bootstrap docs
2. Check [SMOKE_TEST.md](SMOKE_TEST.md) for verification checklist
3. Check container logs: `docker compose logs app`
4. Check health endpoint: `curl http://localhost/health/ready`

## Rollback

If something goes wrong:

```bash
# Find your backup
ls -la .env.backup.*

# Restore it
cp .env.backup.20240102_153045 .env

# Restart
docker compose down
docker compose up -d
```

## Clean Uninstall

```bash
# Stop and remove containers
docker compose down

# Remove volumes (⚠️ deletes all data)
docker compose down --volumes

# Remove all files
cd ..
rm -rf trading-platform-crm
```
