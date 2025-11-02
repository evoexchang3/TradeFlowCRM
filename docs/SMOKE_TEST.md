# Smoke Test Checklist

Run these tests after bootstrap and after secret rotation to verify system health.

## After Bootstrap

### ✅ Prerequisites Check

```bash
# Docker is running
docker --version
# Expected: Docker version 24.0+ or higher

# Docker Compose plugin available
docker compose version
# Expected: Docker Compose version v2.20+ or higher
```

### ✅ Environment Setup

```bash
# .env file exists and has no placeholders
cat .env | grep -i "your_\|placeholder\|example\|TODO"
# Expected: No output (no placeholders found)

# .env backup was created (if re-running)
ls -la .env.backup.*
# Expected: List of backup files with timestamps
```

### ✅ Containers Running

```bash
# All containers are up
docker compose ps
# Expected: All services show "running" status

# All containers are healthy
docker compose ps --format json | jq '.[].Health'
# Expected: All show "healthy" (or no health check)
```

### ✅ Health Endpoints

```bash
# Liveness check
curl -f http://localhost/health/live
# Expected: {"status":"ok","timestamp":"..."}

# Readiness check
curl -f http://localhost/health/ready
# Expected: {"status":"ready","checks":{...},"timestamp":"..."}

# If using domain:
curl -f https://your-domain.com/health/ready
# Expected: Same as above, with valid SSL
```

### ✅ Database

```bash
# Database is accessible
docker compose exec postgres psql -U $PGUSER -d $PGDATABASE -c "SELECT 1;"
# Expected: Returns 1

# Migrations ran successfully
docker compose exec postgres psql -U $PGUSER -d $PGDATABASE -c "\dt"
# Expected: List of tables (users, clients, accounts, etc.)

# Seed data exists
docker compose exec postgres psql -U $PGUSER -d $PGDATABASE -c "SELECT count(*) FROM users;"
# Expected: At least 1 (admin user)

docker compose exec postgres psql -U $PGUSER -d $PGDATABASE -c "SELECT count(*) FROM custom_statuses;"
# Expected: 12 (default statuses)
```

### ✅ Redis (if enabled)

```bash
# Redis is accessible
docker compose exec redis redis-cli --pass "$REDIS_PASSWORD" PING
# Expected: PONG

# Redis info
docker compose exec redis redis-cli --pass "$REDIS_PASSWORD" INFO server | grep redis_version
# Expected: redis_version:7.x.x
```

### ✅ Application Logs

```bash
# No critical errors in app logs
docker compose logs app | grep -i "error\|fatal\|exception" | grep -v "test"
# Expected: No unexpected errors (ignore test errors if any)

# Database connection successful
docker compose logs app | grep -i "database\|postgres"
# Expected: Connection established messages

# Redis connection (if enabled)
docker compose logs app | grep -i "redis"
# Expected: "[Redis] Connected successfully" or similar
```

### ✅ Caddy / Reverse Proxy

```bash
# Caddy is running
docker compose logs caddy | tail -20
# Expected: No errors, shows proxy configuration loaded

# If domain configured, certificate obtained
docker compose logs caddy | grep -i "certificate\|acme"
# Expected: Certificate obtained successfully

# Proxy headers working
curl -I http://localhost/health/live
# Expected: Contains X-Forwarded-* headers
```

### ✅ Admin Access

```bash
# Admin user exists
docker compose exec postgres psql -U $PGUSER -d $PGDATABASE -c "SELECT email, name, is_active FROM users WHERE email = 'apitwelve001@gmail.com';"
# Expected: Returns admin user record with is_active = true
```

Now test in browser:
1. Navigate to your PUBLIC_URL
2. Log in with:
   - Email: `apitwelve001@gmail.com`
   - Password: `Admin123`
3. Expected: Successfully logged in to dashboard

### ✅ Webhook Endpoint

```bash
# Test webhook endpoint (should reject without signature)
curl -X POST http://localhost/api/webhooks/site \
  -H "Content-Type: application/json" \
  -d '{"event":"test","data":{}}'
# Expected: 401 Unauthorized or 400 error about missing signature

# Test with invalid signature
curl -X POST http://localhost/api/webhooks/site \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: invalid" \
  -d '{"event":"test","data":{}}'
# Expected: 401 Invalid signature
```

### ✅ API Access

```bash
# API is accessible (should require auth)
curl http://localhost/api/users
# Expected: 401 Unauthorized (correct - auth required)
```

---

## After Secret Rotation

### ✅ Backup Created

```bash
# Check that new backup was created
ls -lt .env.backup.* | head -1
# Expected: Most recent backup has current timestamp
```

### ✅ Secrets Updated

```bash
# Compare old and new .env (secrets should differ)
diff .env.backup.* .env
# Expected: Shows differences in rotated secrets only
```

### ✅ Container Restart Order

Check logs to verify restart order was correct:

```bash
# For DB rotation: postgres restarted first
docker compose logs --since 5m postgres | grep -i "restart\|start"
# Expected: Restart happened before app restart

# For Redis rotation: redis restarted first
docker compose logs --since 5m redis | grep -i "restart\|start"
# Expected: Restart happened before app restart

# App restarted after dependencies
docker compose logs --since 5m app | grep -i "restart\|start"
# Expected: Restart happened after DB/Redis
```

### ✅ Services Healthy After Rotation

```bash
# All containers healthy
docker compose ps
# Expected: All show "running" (healthy)

# Health endpoint passes
curl -f http://localhost/health/ready
# Expected: {"status":"ready",...}
```

### ✅ Impact Validation

#### If rotated WEBHOOK_SECRET:

```bash
# Webhook still rejects old signature (expected)
# External system needs to be updated with new secret
```

**Action:** Update Trading Platform with new `WEBHOOK_SECRET`.

#### If rotated JWT_SECRET or SESSION_SECRET:

```bash
# Test that old tokens are invalid
# Try to access API with old token
curl -H "Authorization: Bearer <old_token>" http://localhost/api/users
# Expected: 401 Invalid or expired token (correct)
```

**Action:** Users must re-login (expected behavior).

#### If rotated PGPASSWORD:

```bash
# Database connection still works
docker compose exec postgres psql -U $PGUSER -d $PGDATABASE -c "SELECT 1;"
# Expected: Returns 1

# App can query database
curl -f http://localhost/health/ready | jq '.checks.database'
# Expected: {"status":"ok"}
```

#### If rotated REDIS_PASSWORD:

```bash
# Redis connection still works
docker compose exec redis redis-cli --pass "$REDIS_PASSWORD" PING
# Expected: PONG

# App can reach Redis
curl -f http://localhost/health/ready | jq '.checks.redis'
# Expected: {"status":"ok"}
```

### ✅ No Data Loss

```bash
# User count unchanged
docker compose exec postgres psql -U $PGUSER -d $PGDATABASE -c "SELECT count(*) FROM users;"
# Expected: Same count as before rotation

# Client count unchanged
docker compose exec postgres psql -U $PGUSER -d $PGDATABASE -c "SELECT count(*) FROM clients;"
# Expected: Same count as before rotation
```

### ✅ Application Functionality

Test in browser:
1. Navigate to PUBLIC_URL
2. Log in with admin credentials
3. Navigate to Clients page
4. Create a test client
5. View the test client
6. Expected: All CRUD operations work

---

## Quick Health Check Script

Save this as `scripts/health-check`:

```bash
#!/bin/bash
set -e

echo "🔍 Running health checks..."
echo ""

# Container status
echo "📦 Containers:"
docker compose ps --format "table {{.Service}}\t{{.Status}}\t{{.Health}}"
echo ""

# Health endpoints
echo "🏥 Health endpoints:"
echo -n "  Liveness: "
curl -sf http://localhost/health/live > /dev/null && echo "✅ OK" || echo "❌ FAIL"
echo -n "  Readiness: "
curl -sf http://localhost/health/ready > /dev/null && echo "✅ OK" || echo "❌ FAIL"
echo ""

# Database
echo "💾 Database:"
docker compose exec -T postgres psql -U $PGUSER -d $PGDATABASE -c "SELECT 1;" > /dev/null && echo "  ✅ Connected" || echo "  ❌ Failed"
echo ""

# Redis
if [ -n "$REDIS_PASSWORD" ]; then
  echo "📦 Redis:"
  docker compose exec -T redis redis-cli --pass "$REDIS_PASSWORD" PING > /dev/null && echo "  ✅ Connected" || echo "  ❌ Failed"
  echo ""
fi

echo "✅ Health check complete"
```

Make it executable:

```bash
chmod +x scripts/health-check
```

Run it:

```bash
./scripts/health-check
```

---

## Acceptance Criteria

### Clean Server + Domain (Initial Bootstrap)

- [x] Bootstrap completes without errors
- [x] HTTPS certificate obtained successfully
- [x] All containers healthy
- [x] Database migrations applied
- [x] Seed data created (admin user, statuses)
- [x] Webhook endpoint accessible and secured
- [x] No manual edits required

### No-Domain Scenario

- [x] Bootstrap completes without errors (HTTP only)
- [x] App reachable at `http://SERVER_IP:PORT`
- [x] Health checks pass
- [x] Database and Redis connected
- [x] Webhook endpoint accessible

### Secret Rotation

- [x] Backup created with timestamp
- [x] Selected secrets rotated
- [x] Containers restarted in correct order
- [x] Health checks pass after restart
- [x] No data loss
- [x] Expected impact occurred (sessions invalidated if JWT/SESSION rotated)

### Idempotency

- [x] Re-running bootstrap creates new backup
- [x] Existing .env not corrupted
- [x] Can rollback to previous .env

### CI/CD

- [x] Push to main triggers build
- [x] Docker image pushed to registry
- [x] (Optional) Deploy workflow pulls and restarts successfully
- [x] Post-deploy health check passes
