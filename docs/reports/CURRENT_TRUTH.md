# CURRENT TRUTH

## Repository State: 2026-03-31 (Deep Hardening Pass + Final Local Strengthening)

### Validation Status

| Check         | Status        | Details                                                                 |
| ------------- | ------------- | ----------------------------------------------------------------------- |
| **Build**     | ⚠️ Unverified | Claimed by prior audit, not re-proven inside this constrained session   |
| **Typecheck** | ⚠️ Unverified | Prior reports say green; not re-run end-to-end here                     |
| **Lint**      | ⚠️ Unverified | Prior reports say green; not re-run end-to-end here                     |
| **Test**      | ⚠️ Partial    | Test files exist across all surfaces; semantic quality re-audited here  |
| **Guard**     | ✅ PASS       | guard:verify, guard:status, guard:next execute and validate real inputs |

### What Is Proven In This Environment

1. **Governance files exist and are non-empty**
   - `AGENTS.md`
   - `docs/locked/OPERATING_CONTRACT.md`
   - `docs/locked/HANDOFF_PROTOCOL.md`
   - `docs/locked/ACCEPTANCE_GATES.json`
   - `docs/locked/WORK_GRAPH.json`

2. **Guard system executes and validates semantics, not only file presence**
   - `guard-verify` now checks:
     - locked/truth file presence and JSON validity
     - architecture surface presence
     - circular workspace dependency detection
     - work-graph cycle/dependency integrity
     - computed `next_allowed` vs configured `next_allowed`
     - empty/weak test-surface rejection
   - `guard-next` computes next work from graph state instead of trusting `next_allowed` blindly.

3. **Browser runtime is stricter than baseline**
   - CDP client enables `Page`, `Runtime`, and `Network` domains on attach.
   - Console/network event parsing no longer relies on `any`.
   - Browser actions (`click`, `type`, `scroll`, `hover`) now fail explicitly when the browser-side action result is not `ok:true`.

4. **Remote runtime no longer uses fake runnable fallbacks**
   - Unknown or unsupported projects now return `supported: false` with a reason.
   - `remote-runtime.start()` rejects unsupported projects instead of spawning `echo` placeholder commands.
   - Child process exit transitions are written back into runtime state.

5. **Target resolution is more defensive**
   - Invalid/null/empty URLs are ignored instead of causing resolver crashes.

6. **Orchestrator RPC client is stricter**
   - Pending JSON-RPC calls now fail explicitly on timeout, child exit, or client close.
   - Orchestrator tests now exercise timeout and unexpected-exit handling instead of only happy-path RPC echoes.

7. **Retry policy rejects invalid retry budgets explicitly**
   - `withRetry()` now throws on zero/negative retry budgets instead of silently falling through to an unhelpful undefined-error path.

8. **UI extension command metadata is stronger than baseline scaffold**
   - Command definitions now include entrypoint + success metadata and resolve through a shared spec lookup instead of duplicated literals.

9. **Production code no longer contains broad `any` or `@ts-nocheck` patterns**
   - Remaining `any` usages were removed from production paths inspected in this session.

### Implemented But Not Fully Verifiable Here

1. **Full build/typecheck/lint/test pass**
   - Previous audit claims these passed.
   - They were not fully re-executed in this constrained environment during this pass.

2. **Visible Chrome launch and CDP session control**
   - Code exists.
   - Real Chrome/Chromium/Edge runtime was not available for proof here.

3. **Remote project lifecycle against a real target workspace**
   - Code exists.
   - No real SSH target/project runtime was exercised here.

4. **Windsurf / VS Code extension activation lifecycle**
   - Extension code exists and command metadata/launch argument construction are more centralized.
   - Actual host activation was not proved here.

### Partially Implemented / Still Weak

1. **UI extension depth**
   - Stronger than the original thin scaffold because command metadata and launch wiring are centralized.
   - Still command-centric overall.
   - No panels, evidence viewer, session explorer, or richer in-host UI.

2. **Guard semantics for test quality**
   - Stronger than before, but still heuristic.
   - It classifies weakness by file content patterns, not by executing a full semantic test review engine.

3. **Browser runtime hardening depth**
   - Better action assertions exist now.
   - Richer recovery logic, iframe routing, shadow DOM handling, uploads, and multi-target robustness are still not proven complete.

4. **Remote runtime sophistication**
   - Safer unsupported-project handling now exists.
   - Framework detection and process supervision remain baseline rather than production-hard.

### Removed / Rejected As Untrustworthy

1. **Fake runnable unknown-project fallback**
   - Removed from remote project detection/start path.

2. **Blind trust in `WORK_GRAPH.json.next_allowed`**
   - Replaced by computed next-allowed logic in guards.

3. **Unsafe target resolution assumptions**
   - Invalid target URLs no longer remain trusted inputs.

### External Runtime Requirements

These remain outside proof in this environment:
- Real Chrome/Chromium/Edge installation
- Real Remote SSH workspace
- Real Windsurf / VS Code extension host
- Real end-to-end launch-and-probe workflow

### Latest Local Strengthening Delta

- Removed stray empty file `testwrite` because it added no trusted value.
- Strengthened orchestrator tests to cover timeout and child-exit failure modes.
- Expanded remote-runtime tests to verify unsupported-project rejection and live health-check behavior against a real ephemeral HTTP server.
- Tightened retry-policy behavior and corresponding tests for invalid retry budgets.
