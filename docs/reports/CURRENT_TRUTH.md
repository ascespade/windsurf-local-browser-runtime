# CURRENT TRUTH

## Repository State: 2026-03-31

### Validation Status

| Check         | Status     | Details                          |
| ------------- | ---------- | -------------------------------- |
| **Build**     | ✅ PASS    | All 13 packages compile          |
| **Typecheck** | ✅ PASS    | All 13 packages pass strict TS   |
| **Lint**      | ✅ PASS    | All packages pass (1 warning)    |
| **Test**      | ❌ FAKE    | 1/13 packages have real tests    |
| **Guard**     | ✅ PASS    | Commands functional but shallow |

### Architecture

The repository implements a 4-layer monorepo:

1. **browser-mcp** - Local browser runtime with Chrome launcher, CDP client, JSON-RPC stdio server
2. **remote-runtime** - Remote project detection, process management, health checks
3. **orchestrator** - Launch-and-probe workflow coordinator
4. **ui-extension** - VS Code extension command scaffold

Supporting packages: protocol, shared-types, retry-policy, selector-engine, session-store, target-resolver, url-bridge, action-engine, audit-core.

### Validation Fixes Applied

1. Fixed orchestrator/client.ts null check errors (lines 31, 32, 63)
2. Fixed retry-policy unused parameter lint error
3. Added missing no-unused-vars override for retry-policy in eslint.config.mjs

### Governance System Status

| Component                | Status     | Details                          |
| ------------------------ | ---------- | -------------------------------- |
| **AGENTS.md**            | ✅ PASS    | Agent roles and handoff rules defined |
| **OPERATING_CONTRACT.md**| ✅ PASS    | Immutable rules and procedures documented |
| **HANDOFF_PROTOCOL.md**  | ✅ PASS    | Agent handoff procedures defined |
| **ACCEPTANCE_GATES.json**| ✅ PASS    | Validation gates and dependencies defined |
| **WORK_GRAPH.json**      | ✅ PASS    | Work dependency graph active |
| **Guard Commands**       | ⚠️ WEAK   | Only check file presence, not semantics |

### Recent Implementation Changes

1. **PRIORITY 0 COMPLETED**: Governance lock implementation
   - Created all required locked governance files
   - Implemented functional guard command system
   - Established work dependency graph
   - Added agent handoff protocols

2. **PRIORITY 1 COMPLETED**: Truth lock update
   - Updated CURRENT_TRUTH.md with accurate repository state
   - All guard commands functional and validating

3. **PRIORITY 2 COMPLETED**: Browser runtime hardening
   - ✅ Console event capture implemented via CDP client
   - ✅ Network event capture implemented via CDP client  
   - ✅ Durable evidence sinks with EventCapture class
   - ✅ Richer action coverage (scroll, hover) added
   - ✅ Improved session state updates with event flushing
   - ✅ Event capture integrated into session lifecycle

4. **PRIORITY 3 PARTIALLY COMPLETED**: Test foundation creation
   - ✅ Working test setup for session-store with Node.js test runner
   - ✅ Real FileBackedSessionStore integration tests (8/8 passing)
   - ✅ Fixed JSON serialization/deserialization issues
   - ✅ Fixed async method compatibility
   - ❌ Other 12 packages have fake test infrastructure (empty test suites reporting as passing)

### Browser Runtime Enhancements

- **Event Capture**: Real-time console and network event streaming to evidence files
- **Enhanced Actions**: Added scroll() and hover() methods to BrowserRuntime
- **Evidence Persistence**: Automatic event flushing on snapshots and session close
- **CDP Improvements**: Extended CdpClient with event listener support
- **Action Engine**: Extended with planScroll() and planHover() functions

### Known Gaps

1. **Test Infrastructure Crisis**: 12/13 packages have fake test infrastructure - empty test suites report as passing
2. **Guard Validation Weakness**: Guard commands only check file presence, not actual functionality or semantic validation
3. **Runtime hardening**: Remote runtime, orchestrator, and ui-extension need similar enhancements
4. **Shadow DOM handling**: Not implemented
5. **Upload handling**: Not implemented

### External Runtime Requirements

These cannot be verified in this environment:

- Chrome/Chromium/Edge installation
- Remote SSH workspace connection
- VS Code extension host
- Actual project detection and orchestration

### Security Posture

- ✅ Isolated Chrome profiles via --user-data-dir
- ✅ No default Chrome profile usage
- ✅ Proper process spawning with PID tracking
- ✅ No eval() or dynamic code execution
- ✅ Input validation on all JSON-RPC interfaces
