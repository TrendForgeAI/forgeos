FROM node:24-slim

ARG FORGE_UID=1000
ARG FORGE_GID=1000

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    wget \
    ca-certificates \
    gnupg \
    sqlite3 \
    openssh-client \
    bash \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | \
    dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | \
    tee /etc/apt/sources.list.d/github-cli.list > /dev/null && \
    apt-get update && apt-get install -y gh && \
    rm -rf /var/lib/apt/lists/*

# Create forge user
RUN groupadd -g ${FORGE_GID} forge && \
    useradd -u ${FORGE_UID} -g forge -m -s /bin/bash -d /home/forge forge

# Pre-create volume mount points as forge user
RUN mkdir -p /home/forge/.forgeos \
             /home/forge/.claude \
             /home/forge/.ssh \
             /home/forge/.config/gh \
             /workspace && \
    chown -R forge:forge /home/forge /workspace

# Install global npm tools as forge user
USER forge
WORKDIR /home/forge

RUN npm install -g \
    @anthropic-ai/claude-code \
    @openai/codex \
    prisma

# Copy app source
WORKDIR /app
COPY --chown=forge:forge . .

# Install app dependencies
RUN npm ci --omit=dev 2>/dev/null || npm install

# Build Next.js
RUN npm run build

EXPOSE 3000

COPY --chown=forge:forge entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "server.js"]
