#!/bin/bash
set -e

# Ensure data directories exist
mkdir -p \
  /root/.forgeos \
  /root/.claude \
  /root/.ssh \
  /root/.config/gh \
  /workspace

# Set correct SSH key permissions if keys exist
if [ -f /root/.ssh/id_ed25519 ]; then
  chmod 600 /root/.ssh/id_ed25519
fi

# Initialize database on first start
if [ ! -f /root/.forgeos/forgeos.db ]; then
  echo "Initializing ForgeOS database..."
  cd /app && npx prisma db push --schema=/app/prisma/schema.prisma
fi

echo "ForgeOS ready on port 3000"
exec "$@"
