# Trading Platform CRM - Self-Hosted

Enterprise-grade CRM system for trading platforms with in-house trading engine, real-time market data, and comprehensive client management.

## 🚀 Quick Start

### Self-Hosting (Production)

1. **Prerequisites**
   - Ubuntu 20.04+ (or similar Linux)
   - Docker Engine 24+ with Compose plugin
   - Domain name (optional, for HTTPS)

2. **One-Command Bootstrap**
   ```bash
   git clone <your-repo>
   cd <repo-directory>
   ./scripts/bootstrap
   ```

3. **Follow the prompts** for:
   - Domain name (or leave empty for localhost)
   - Email for SSL certificates
   - External API keys (optional)

4. **Access your CRM**
   - Navigate to your configured URL
   - Default credentials: `apitwelve001@gmail.com` / `Admin123`
   - **Change password immediately!**

For detailed instructions, see [docs/BOOTSTRAP.md](docs/BOOTSTRAP.md)

## 📚 Documentation

- **[Bootstrap Guide](docs/BOOTSTRAP.md)** - Initial setup and provisioning
- **[Environment Variables](docs/ENV_VARS.md)** - Complete variable reference
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Backups, logs, scaling, CI/CD
- **[Secrets Inventory](docs/SECRETS_INVENTORY.md)** - Security and rotation
- **[Smoke Tests](docs/SMOKE_TEST.md)** - Verification checklist

## 🔐 Security

All secrets are generated cryptographically during bootstrap:
- No placeholders or example values
- Automatic backup before changes
- Safe rotation with `./scripts/rotate-secrets`

See [docs/SECRETS_INVENTORY.md](docs/SECRETS_INVENTORY.md) for details.

## 🏗️ Architecture

- **Frontend**: React + TypeScript (Vite)
- **Backend**: Node.js + Express
- **Database**: PostgreSQL 16
- **Cache**: Redis 7 (optional - can run without it)
- **Reverse Proxy**: Caddy (automatic HTTPS)
- **Orchestration**: Docker Compose

> **Note**: Redis is optional. During bootstrap, you can choose to disable it. Sessions will use in-memory storage if Redis is not enabled.

## 🛠️ Operations

### Health Checks
```bash
# Quick check
./scripts/health-check

# Manual
curl https://your-domain.com/health/ready
```

### View Logs
```bash
docker compose logs -f
```

### Rotate Secrets
```bash
# Rotate webhook secret
./scripts/rotate-secrets --webhook

# Rotate session secrets (logs out all users)
./scripts/rotate-secrets --session --jwt

# Dry run (see what would change)
./scripts/rotate-secrets --webhook --dry-run
```

### Backups
```bash
# Database backup
docker compose exec postgres pg_dump -U crm_user crm | gzip > backup-$(date +%Y%m%d).sql.gz
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for comprehensive operations guide.

## 🔄 CI/CD

Automatic deployments via GitHub Actions:

1. Set deployment secrets in GitHub
2. Push to `main` branch
3. Image builds and deploys automatically

See [docs/DEPLOYMENT.md#cicd-setup](docs/DEPLOYMENT.md#cicd-setup) for setup instructions.

## 🌐 Features

- **Client Management**: KYC tracking, multi-fund types, pipeline management
- **Trading Engine**: Real-time P/L, margin management, SL/TP
- **Market Data**: Integration with Twelve Data (WebSocket + REST)
- **Role-Based Access**: Custom roles with granular permissions
- **Multi-Language**: 16 languages with full i18n support
- **Audit Logging**: Comprehensive activity tracking
- **WebSocket**: Real-time updates for trading and chat
- **Trading Platform Integration**: Webhooks and SSO

## 📖 Development

### Local Development
```bash
# Uses docker-compose.override.yml automatically
docker compose up
```

### Run Migrations
```bash
docker compose exec app npx drizzle-kit push
```

### Seed Database
```bash
docker compose exec app npm run seed
```

## 🆘 Support

Check the documentation:
- [Bootstrap troubleshooting](docs/BOOTSTRAP.md#troubleshooting)
- [Deployment troubleshooting](docs/DEPLOYMENT.md#troubleshooting)
- [Smoke test checklist](docs/SMOKE_TEST.md)

## 📜 License

MIT
