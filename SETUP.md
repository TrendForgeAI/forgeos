# ForgeOS — Setup Guide

## Prerequisites

- A Linux server (Ubuntu 22.04+ recommended)
- Docker 24+ and Docker Compose v2
- A domain pointing to your server (A record → server IP)
- Traefik v3 running as reverse proxy on an external Docker network named `proxy`

### Setting up Traefik (if not already running)

```bash
# Create the external proxy network
docker network create proxy

# Minimal Traefik docker-compose.yml (separate from ForgeOS)
# See https://doc.traefik.io/traefik/getting-started/quick-start/
```

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/TrendForgeAI/forgeos.git
cd forgeos
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```bash
# Required
DOMAIN=forgeos.yourdomain.com
SESSION_SECRET=<random 64-char string>

# Generate a secret:
openssl rand -hex 32
```

### 3. Build and start

```bash
docker compose up -d --build
```

This will:
- Build the ForgeOS Docker image
- Start the container on port 3000 (proxied by Traefik)
- Initialize the SQLite database on first boot

### 4. Run the Setup Wizard

Open `https://forgeos.yourdomain.com` in your browser.

The wizard guides you through:

1. **Admin Account** — Create the primary administrator
2. **Git Identity** — Set name/email for commits + optional GitHub auth (device flow)
3. **AI Providers** — Anthropic API key (Claude) and/or OpenAI API key (Codex)
4. **First Project** — Optional: clone a Git repo into `/workspace`

---

## Updates

```bash
git pull
docker compose up -d --build
```

Data is stored in named Docker volumes and persists across rebuilds:
- `forgeos-data` — SQLite database + config
- `claude-data` — Claude Code credentials
- `forgeos-workspace` — Project repos

---

## Volumes

| Volume | Mount | Contents |
|--------|-------|----------|
| `forgeos-data` | `/root/.forgeos` | Database, config |
| `claude-data` | `/root/.claude` | Claude Code credentials |
| `ssh-keys` | `/root/.ssh` | SSH keypair |
| `gh-config` | `/root/.config/gh` | GitHub CLI tokens |
| `forgeos-workspace` | `/workspace` | Project repos |

---

## Backup

```bash
# Backup all ForgeOS volumes
docker run --rm \
  -v forgeos-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/forgeos-backup-$(date +%Y%m%d).tar.gz /data
```

---

## Troubleshooting

**Container won't start**
```bash
docker compose logs forgeos
```

**Database issues**
```bash
docker compose exec forgeos npx prisma db push --schema=/app/prisma/schema.prisma
```

**Reset everything**
```bash
docker compose down -v  # WARNING: destroys all data
docker compose up -d --build
```
