# ForgeOS — Overview

ForgeOS is a containerized, multi-user AI development environment. It runs as a Docker container and exposes a Next.js web UI (port 3000) serving as a full IDE shell.

## Core Purpose
- Give AI assistants (Claude Code, Codex) a persistent, browser-accessible workspace
- Multi-user with role-based access (admin / user)
- Setup wizard on first run; credentials stored in named volumes (survive rebuilds)
- Git-integrated: clone projects, edit files, commit, push — all from the browser

## What Users Do
1. `docker compose up` → visit the URL → run setup wizard
2. Authenticate Claude and/or Codex
3. Connect GitHub via Device Flow, Personal Access Token, or SSH key
4. Open projects in the sidebar, edit files, run terminals, chat with AI
