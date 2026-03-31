# OPERATING CONTRACT

## Repository Governance Contract

This contract defines the operating rules for all agents working on the windsurf-local-browser-runtime repository.

### Immutable Rules

1. **NO GOVERNANCE DRIFT**: Never modify locked files without following handoff protocol
2. **NO ARCHITECTURE DRIFT**: Never create competing architectures outside 4-layer model
3. **NO FAKE COMPLETION**: Never claim work is done without verifiable proof
4. **NO BYPASS GUARDS**: Never skip guard validation for any reason
5. **NO BROKEN COMPATIBILITY**: Never break protocol compatibility between layers

### Work Priorities

1. **PRIORITY 0**: Governance lock and guard system health
2. **PRIORITY 1**: Truth lock and accurate reporting  
3. **PRIORITY 2**: Browser runtime hardening and feature completion
4. **PRIORITY 3**: Test foundation for core units
5. **PRIORITY 4**: Documentation and polish

### Validation Requirements

- All code must compile with `pnpm build`
- All code must pass `pnpm typecheck`
- All code must pass `pnpm lint`
- All code must pass `pnpm test` when tests exist
- All work must pass `pnpm guard:verify`

### Handoff Protocol

1. Current agent runs `pnpm guard:verify` 
2. Current agent updates CURRENT_TRUTH.md with accurate status
3. Next agent runs `pnpm guard:status` before starting
4. Next agent runs `pnpm guard:next` to confirm allowed work
5. Work proceeds only after all validations pass

### Emergency Procedures

If guard system fails:
1. Document failure in CURRENT_TRUTH.md
2. Restore minimal guard functionality
3. Re-establish governance lock
4. Require consensus for major changes

### Quality Standards

- No TODO comments where real code should exist
- No console.log or debug statements in production code
- No unused dependencies
- No broken imports or exports
- No type errors or warnings

### Security Requirements

- No eval() or dynamic code execution
- Input validation on all external interfaces
- Isolated Chrome profiles
- Proper process cleanup
- No credential exposure in code
