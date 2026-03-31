# HANDOFF PROTOCOL

## Agent Handoff Procedures

This protocol ensures clean, verifiable handoffs between agents working on the repository.

### Pre-Handoff Checklist (Current Agent)

- [ ] All code compiles: `pnpm build`
- [ ] All typechecks pass: `pnpm typecheck` 
- [ ] All lint checks pass: `pnpm lint`
- [ ] All tests pass: `pnpm test`
- [ ] Guard validation passes: `pnpm guard:verify`
- [ ] CURRENT_TRUTH.md updated with accurate status
- [ ] No broken imports or exports
- [ ] No debug code left in production
- [ ] All TODO comments resolved or documented

### Handoff Command Sequence

1. **Current Agent**: `pnpm guard:verify`
2. **Current Agent**: Update CURRENT_TRUTH.md
3. **Next Agent**: `pnpm guard:status`
4. **Next Agent**: `pnpm guard:next`
5. **Next Agent**: Begin work only if all validations pass

### Post-Handoff Checklist (Next Agent)

- [ ] Repository state matches guard:status output
- [ ] Next allowed work matches guard:next output
- [ ] No unexpected changes in working directory
- [ ] All locked files present and valid
- [ ] Guard commands functional

### Failure Modes

#### Guard System Failure
1. Document failure in CURRENT_TRUTH.md
2. Implement minimal guard fix
3. Re-establish governance lock
4. Retry handoff protocol

#### Validation Failure
1. Current agent fixes validation issues
2. Re-run all validations
3. Update CURRENT_TRUTH.md
4. Retry handoff protocol

#### Architecture Drift
1. Document drift in CURRENT_TRUTH.md
2. Restore compliance with 4-layer model
3. Remove competing architectures
4. Re-establish governance lock

### Emergency Handoff

In emergency situations where normal protocol cannot be followed:
1. Document emergency in CURRENT_TRUTH.md
2. Implement minimal stabilization
3. Restore guard functionality
4. Resume normal protocol as soon as possible

### Verification Standards

- **Implemented**: Code exists and functions
- **Verified here**: Validated in current environment
- **Prepared but not verifiable here**: Code ready but requires external runtime
- **Still blocked**: Cannot proceed due to external dependencies

No other completion states are acceptable.
