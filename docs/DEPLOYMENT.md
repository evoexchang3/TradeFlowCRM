# Deployment & Operations Guide

Day-2 operations guide for the self-hosted CRM.

## Backups

### Database Backups

#### Automated Daily Backup

Create a cron job for daily backups:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /path/to/crm && ./scripts/backup-database
```

#### Manual Backup

```bash
# Create backup
docker compose exec postgres pg_dump -U $PGUSER $PGDATABASE | gzip > backup-$(date +\%Y\%m\%d-\%H\%M\%S).sql.gz

# List backups
ls -lh backup-*.sql.gz
```

#### Retention Policy

Recommended retention:
- Daily backups: Keep 7 days
- Weekly backups: Keep 4 weeks  
- Monthly backups: Keep 12 months

```bash
# Delete backups older than 7 days
find . -name "backup-*.sql.gz" -mtime +7 -delete
```

### Redis Backups

Redis persistence is enabled with RDB snapshots:

```bash
# Trigger manual save
docker compose exec redis redis-cli --pass $REDIS_PASSWORD SAVE

# Copy RDB file
docker cp crm-redis:/data/dump.rdb redis-backup-$(date +\%Y\%m\%d).rdb
```

### Upload Files Backup

If using local volume storage:

```bash
# Backup uploads
tar -czf uploads-backup-$(date +\%Y\%m\%d).tar.gz uploads/

# Restore uploads
tar -xzf uploads-backup-20240102.tar.gz
```

If using S3-compatible storage, backups are handled by your object storage provider.

## Restore Procedures

### Restore Database

```bash
# Stop the app
docker compose stop app

# Drop and recreate database (⚠️ destructive)
docker compose exec postgres psql -U $PGUSER -c "DROP DATABASE $PGDATABASE;"
docker compose exec postgres psql -U $PGUSER -c "CREATE DATABASE $PGDATABASE;"

# Restore from backup
gunzip < backup-20240102-020000.sql.gz | docker compose exec -T postgres psql -U $PGUSER -d $PGDATABASE

# Restart app
docker compose start app
```

### Restore Redis

```bash
# Stop Redis
docker compose stop redis

# Replace RDB file
docker cp redis-backup-20240102.rdb crm-redis:/data/dump.rdb

# Start Redis
docker compose start redis
```

## Logs and Monitoring

### Viewing Logs

```bash
# All services
docker compose logs -f

# Specific service with tail
docker compose logs -f --tail=100 app

# Since specific time
docker compose logs --since 2024-01-02T10:00:00

# Write to file
docker compose logs --no-color > logs-$(date +\%Y\%m\%d).txt
```

### Log Rotation

Docker handles log rotation automatically. Configure in `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Then restart Docker:

```bash
sudo systemctl restart docker
docker compose up -d
```

### Basic Metrics

#### Check Resource Usage

```bash
# Container stats
docker stats

# Disk usage
docker system df

# Volume usage
docker volume ls
du -sh /var/lib/docker/volumes/crm_*
```

#### Database Metrics

```bash
# Connection count
docker compose exec postgres psql -U $PGUSER -d $PGDATABASE -c "SELECT count(*) FROM pg_stat_activity;"

# Database size
docker compose exec postgres psql -U $PGUSER -d $PGDATABASE -c "SELECT pg_size_pretty(pg_database_size('$PGDATABASE'));"

# Table sizes
docker compose exec postgres psql -U $PGUSER -d $PGDATABASE -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 10;"
```

## Scaling

### Horizontal Scaling (Multiple App Instances)

Edit `docker-compose.yml`:

```yaml
services:
  app:
    # ... existing config ...
    deploy:
      replicas: 3
```

Restart:

```bash
docker compose up -d --scale app=3
```

### Vertical Scaling (Resource Limits)

Edit `docker-compose.yml`:

```yaml
services:
  app:
    # ... existing config ...
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G
```

### Database Performance Tuning

Edit PostgreSQL settings:

```bash
# Create custom postgres config
cat > postgres.conf << EOF
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 2MB
min_wal_size = 1GB
max_wal_size = 4GB
EOF

# Update docker-compose.yml to mount config
# Then restart
docker compose restart postgres
```

## CI/CD Setup

### Required GitHub Secrets

Set these in your GitHub repository settings (Settings → Secrets and variables → Actions):

| Secret | Purpose | Example |
|--------|---------|---------|
| `DEPLOY_HOST` | Server IP or hostname | `crm.example.com` |
| `DEPLOY_USER` | SSH username | `deploy` |
| `DEPLOY_SSH_KEY` | Private SSH key for auth | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `DEPLOY_PORT` | SSH port | `22` |
| `DEPLOY_PATH` | Project directory on server | `/opt/crm` |
| `DEPLOY_URL` | Public URL for health check | `https://crm.example.com` |

### SSH Key Setup

On your server:

```bash
# Create deploy user
sudo adduser deploy
sudo usermod -aG docker deploy

# Switch to deploy user
sudo su - deploy

# Generate SSH key (run this on your local machine)
ssh-keygen -t ed25519 -C "github-actions-deploy" -f deploy_key

# Copy public key to server
ssh-copy-id -i deploy_key.pub deploy@crm.example.com

# Add private key to GitHub secrets
cat deploy_key  # Copy this to DEPLOY_SSH_KEY secret
```

### Triggering Deployments

Deployments trigger automatically on push to `main`:

```bash
git push origin main
```

Or trigger manually from GitHub Actions tab → Deploy to Server → Run workflow.

### Deployment Steps

The workflow performs:

1. SSH to server
2. Pull latest Docker images
3. Restart containers with new images
4. Run any pending migrations
5. Health check to verify deployment

## Maintenance Tasks

### Update Dependencies

```bash
# Pull latest images
docker compose pull

# Restart with new images
docker compose up -d

# Run migrations if needed
docker compose exec app npx drizzle-kit push
```

### Database Migrations

```bash
# Check pending migrations
docker compose exec app npx drizzle-kit check

# Apply migrations
docker compose exec app npx drizzle-kit push

# Generate new migration (development)
npm run db:push
```

### Clean Up Docker Resources

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes (⚠️ careful!)
docker volume prune

# Full cleanup
docker system prune -a --volumes
```

### SSL Certificate Renewal

Caddy handles automatic renewal. Check certificate status:

```bash
# View Caddy logs
docker compose logs caddy | grep -i cert

# Force renewal
docker compose exec caddy caddy reload
```

## Troubleshooting

### App Won't Start

```bash
# Check logs
docker compose logs app

# Verify environment variables
docker compose exec app env | grep -E 'DATABASE|REDIS|SESSION'

# Test database connection
docker compose exec app node -e "require('./dist/db.js')"
```

### High Memory Usage

```bash
# Identify memory hogs
docker stats --no-stream

# Restart memory-heavy service
docker compose restart app

# Check for memory leaks in logs
docker compose logs app | grep -i 'heap\|memory'
```

### Database Connection Pool Exhausted

```bash
# Check active connections
docker compose exec postgres psql -U $PGUSER -d $PGDATABASE -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# Kill idle connections
docker compose exec postgres psql -U $PGUSER -d $PGDATABASE -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND state_change < now() - interval '1 hour';"

# Increase pool size in server/db.ts
```

### Slow Queries

```bash
# Enable slow query logging
docker compose exec postgres psql -U $PGUSER -d $PGDATABASE -c "ALTER SYSTEM SET log_min_duration_statement = 1000;"
docker compose restart postgres

# View slow queries
docker compose logs postgres | grep "duration:"
```

## Security Hardening

### Firewall Setup

```bash
# Allow only necessary ports
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
sudo ufw enable
```

### Regular Security Updates

```bash
# Update host system
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker compose pull
docker compose up -d
```

### Audit Logs

Review security events:

```bash
# View audit logs from app
docker compose exec postgres psql -U $PGUSER -d $PGDATABASE -c "SELECT * FROM audit_logs WHERE action IN ('login', 'failed_login', 'permission_change') ORDER BY created_at DESC LIMIT 50;"
```
