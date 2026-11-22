#!/usr/bin/env bash
# Ships the backend to the server and (re)starts it. Run from your laptop:
#   SERVER=ubuntu@<server-ip> SSH_KEY=~/.ssh/oracle.key infra/deployment/deploy.sh
# Needs .env.production in the repo root (copy .env.production.example).
set -euo pipefail

: "${SERVER:?Set SERVER=ubuntu@<server-ip>}"
SSH="ssh -o StrictHostKeyChecking=accept-new"
[ -n "${SSH_KEY:-}" ] && SSH="$SSH -i $SSH_KEY"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEST="untoldmoney"
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.production"

[ -f "$ROOT/.env.production" ] || { echo "Missing .env.production (copy .env.production.example)"; exit 1; }

$SSH "$SERVER" "mkdir -p $DEST/apps/api $DEST/infra/deployment"

rsync -az --delete -e "$SSH" \
  --exclude '__pycache__' --exclude '*.pyc' --exclude '.venv*' --exclude 'celerybeat-schedule' \
  --exclude '.pytest_cache' --exclude '.mypy_cache' --exclude '.ruff_cache' --exclude '.env' \
  "$ROOT/apps/api/" "$SERVER:$DEST/apps/api/"
rsync -az -e "$SSH" "$ROOT/infra/deployment/Caddyfile" "$SERVER:$DEST/infra/deployment/"
rsync -az -e "$SSH" "$ROOT/docker-compose.prod.yml" "$ROOT/.env.production" "$SERVER:$DEST/"

$SSH "$SERVER" "cd $DEST && $COMPOSE up -d --build --remove-orphans && docker image prune -f >/dev/null && $COMPOSE ps"
