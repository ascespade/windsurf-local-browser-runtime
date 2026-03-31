# Implementation Plan

## Objective
Deliver a visible local browser runtime that remains local while the project runtime remains with the workspace, including Remote SSH-oriented orchestration.

## Current baseline implemented
- Monorepo structure
- Typed protocol contracts
- JSON-RPC stdio transport
- Local Chrome launch with isolated profile
- CDP attach and page actions
- File-backed session persistence
- Remote project detection/start/health
- Orchestrator launch-and-probe flow
- Extension command scaffold

## Next hardening wave
1. Add event subscription and persistent console/network capture.
2. Replace DOM-only click/type with mixed CDP input and DOM fallback.
3. Add upload, keypress, select, scroll, and replay tools.
4. Add structured logs and durable audit reports per run.
5. Add workspace/editor-side configuration and settings surface.
6. Add richer tests and simulated integration harnesses.
