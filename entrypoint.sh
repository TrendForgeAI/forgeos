#!/bin/bash
set -e

# Root guard — Claude Code refuses to run as root
if [ "$(id -u)" = "0" ]; then
  echo "ERROR: ForgeOS must not run as root." >&2
  echo "Set FORGE_UID and FORGE_GID in .env and rebuild." >&2
  exit 1
fi

echo "ForgeOS starting as $(id -un) ($(id -u):$(id -g))"

# Ensure volume directories exist with correct ownership
mkdir -p \
  "${HOME}/.forgeos" \
  "${HOME}/.claude" \
  "${HOME}/.ssh" \
  "${HOME}/.config/gh" \
  /workspace

# Set correct SSH key permissions if keys exist
if [ -f "${HOME}/.ssh/id_ed25519" ]; then
  chmod 600 "${HOME}/.ssh/id_ed25519"
fi

# Initialize database if it doesn't exist
if [ ! -f "${HOME}/.forgeos/forgeos.db" ]; then
  echo "Initializing ForgeOS database..."
  cd /app && npx prisma migrate deploy --schema=/app/prisma/schema.prisma 2>/dev/null || \
    npx prisma db push --schema=/app/prisma/schema.prisma
fi

echo "ForgeOS ready. Starting Next.js on port 3000..."
exec "$@"
