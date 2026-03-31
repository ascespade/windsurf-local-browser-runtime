# CURRENT TRUTH

## Repository State: 2026-03-31 (Deep Audit)

### Validation Status

| Check         | Status  | Details                                                              |
| ------------- | ------- | -------------------------------------------------------------------- |
| **Build**     | ✅ PASS | All 13 packages compile                                              |
| **Typecheck** | ✅ PASS | All 13 packages pass strict TS (no @ts-nocheck in production code)   |
| **Lint**      | ✅ PASS | All packages pass (1 warning: unused eslint-disable in ui-extension) |
| **Test**      | ✅ PASS | 13/13 packages have real tests, 197 total, 0 failures                |
| **Guard**     | ✅ PASS | Semantic validation (architecture, test infra, work graph)           |

### Architecture

The repository implements a 4-layer monorepo:

1. **browser-mcp** - Local browser runtime with Chrome launcher, CDP client, JSON-RPC stdio server
2. **remote-runtime** - Remote project detection, process management, health checks
3. **orchestrator** - Launch-and-probe workflow coordinator with JSON-RPC client
4. **ui-extension** - VS Code extension with command definitions and activation lifecycle

Supporting packages: protocol, shared-types, retry-policy, selector-engine, session-store, target-resolver, url-bridge, action-engine, audit-core.

### Test Infrastructure

| Package         | Tests | Type       | Test Runner                                                |
| --------------- | ----- | ---------- | ---------------------------------------------------------- |
| protocol        | 23    | Structural | pnpm build && node --test dist/\*_/_.test.js               |
| target-resolver | 19    | Behavioral | pnpm build && node --test dist/\*_/_.test.js               |
| retry-policy    | 18    | Behavioral | pnpm build && node --test dist/\*_/_.test.js               |
| selector-engine | 13    | Behavioral | pnpm build && node --test dist/\*_/_.test.js               |
| session-store   | 20    | Behavioral | pnpm build && node --test dist/\*_/_.test.js               |
| action-engine   | 11    | Behavioral | pnpm build && node --test dist/\*_/_.test.js               |
| url-bridge      | 22    | Behavioral | pnpm build && node --test dist/\*_/_.test.js               |
| shared-types    | 9     | Structural | pnpm build && node --test dist/\*_/_.test.js               |
| audit-core      | 13    | Behavioral | pnpm build && node --test dist/\*_/_.test.js               |
| browser-mcp     | 18    | Behavioral | node --test --experimental-strip-types tests/\*_/_.test.ts |
| remote-runtime  | 15    | Behavioral | node --test --experimental-strip-types tests/\*_/_.test.ts |
| orchestrator    | 9     | Behavioral | pnpm build && node --test --experimental-strip-types       |
| ui-extension    | 7     | Structural | node --test --experimental-strip-types tests/\*_/_.test.ts |

**Total: 197 tests across 13 packages, 0 failures.**

### Governance System Status

| Component                 | Status    | Details                                                   |
| ------------------------- | --------- | --------------------------------------------------------- |
| **AGENTS.md**             | ✅ PASS   | Agent roles and handoff rules defined                     |
| **OPERATING_CONTRACT.md** | ✅ PASS   | Immutable rules and procedures documented                 |
| **HANDOFF_PROTOCOL.md**   | ✅ PASS   | Agent handoff procedures defined                          |
| **ACCEPTANCE_GATES.json** | ✅ PASS   | All 4 validation gates present with dependencies          |
| **WORK_GRAPH.json**       | ✅ PASS   | Status fields on completed nodes, valid dependency chains |
| **guard:verify**          | ✅ STRONG | Validates architecture, test infra, work graph semantics  |
| **guard:status**          | ✅ STRONG | Shows real test status per package                        |
| **guard:next**            | ✅ STRONG | Respects dependency chains and blocked nodes              |

### Deep Audit Remediation (This Session)

1. **Replaced fake session-store/basic.test.ts** (was testing Node.js builtins, not the module)
   - Now: 12 real tests for InMemorySessionStore (upsert, get, delete, list, load, patch)
   - Root cause: Test file existed but exercised zero project code

2. **Fixed test commands for remote-runtime and ui-extension** (were missing path argument)
   - `node --test` without path defaults to `test/` dir, but tests are in `tests/`
   - Now: explicit `tests/**/*.test.ts` path in both package.json files

3. **Removed @ts-nocheck from orchestrator/client.ts**
   - Root cause: `import { spawn, ChildProcess }` violated `verbatimModuleSyntax`
   - Fixed: proper `import type { ChildProcess }`, try/catch on JSON.parse, child error event handler

4. **Enhanced orchestrator tests from trivial to behavioral**
   - Was: 4 export-existence checks
   - Now: 9 tests including JSON-RPC echo server communication, error handling, concurrent calls

5. **Removed console.error debug statement** from session-store/basic.test.ts

### Source Code Quality (Verified)

- No `@ts-nocheck` in production code (removed from orchestrator/client.ts)
- No `console.log` or debug statements in production code
- No TODO comments where real code should exist
- No eval() or dynamic code execution
- Proper error handling in all runtime paths
- Isolated Chrome profiles via --user-data-dir

### Known Limitations

- **protocol and shared-types tests are structural** — modules export only TypeScript types, no runtime logic to test behaviorally
- **ui-extension tests are structural** — module depends on vscode which is unavailable in test
- **orchestrator tests use echo server** — real JSON-RPC communication tested but not full launch-and-probe flow (requires Chrome + remote runtime)

### External Runtime Requirements (Not Verifiable Here)

- Chrome/Chromium/Edge installation
- Remote SSH workspace connection
- VS Code extension host
- Actual project detection and orchestration
