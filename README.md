# Windsurf Local Browser Runtime

A production-oriented monorepo skeleton for a visible local browser runtime that can be orchestrated while a project is open over Remote SSH.

## What is implemented

- Local visible Chrome/Chromium launcher with isolated `--user-data-dir`
- DevTools discovery over HTTP + WebSocket CDP attach
- Basic browser tools: launch, attach, open, click, type, wait, evaluate, snapshot, close
- File-backed session store
- Remote project inspector + starter with simple framework detection
- Orchestrator that starts the remote project, launches the browser, performs health verification, and captures evidence
- VS Code/Windsurf extension scaffold with commands

## Monorepo

- `apps/browser-mcp` — local browser runtime and stdio JSON-RPC interface
- `apps/remote-runtime` — remote project runtime and health checks
- `apps/orchestrator` — launch-and-probe workflow
- `apps/ui-extension` — command registration scaffold
- `packages/*` — protocol, audit, action planning, selector ranking, retry, etc.

## Important limits in this implementation

This repository now contains **real implementation**, but it is still a first end-to-end baseline and not yet a fully hardened enterprise browser agent. Notable remaining hard problems include:

- robust network/console event streaming
- multi-target and iframe routing
- shadow DOM traversal
- upload handling
- richer selector engines and semantic retries
- true Windsurf-native panels/views
- Remote SSH port-forward introspection from the host editor

## Quick start

```bash
pnpm install
pnpm build
pnpm typecheck
```

Run the orchestrator against a local or remote-mounted project path:

```bash
node --experimental-strip-types apps/orchestrator/src/index.ts /path/to/project
```

## Design principle

The browser remains local and visible. The project runtime stays with the workspace. The orchestrator bridges both.
