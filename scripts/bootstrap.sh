#!/usr/bin/env bash
set -euo pipefail

echo "[wlbr] bootstrap starting"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "[wlbr] pnpm is required. Install pnpm 10+ before continuing."
  exit 1
fi

pnpm install
pnpm typecheck || true

echo "[wlbr] bootstrap complete"
