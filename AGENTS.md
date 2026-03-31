# AGENTS

## Primary Agent Roles

### Cascade (Primary Implementation Agent)
- **Purpose**: Core repository development, feature implementation, testing
- **Scope**: Full stack development across all 4 layers
- **Authority**: Can modify any code, create tests, update governance
- **Constraints**: Must follow locked governance, validate via guard commands

### Browser Runtime Specialist
- **Purpose**: Browser automation, CDP integration, Chrome management
- **Scope**: browser-mcp app, selector-engine, action-engine packages
- **Authority**: Can modify browser-related code and tests
- **Constraints**: Must maintain protocol compatibility

### Remote Runtime Specialist  
- **Purpose**: Remote project detection, process management, health checks
- **Scope**: remote-runtime app, url-bridge, target-resolver packages
- **Authority**: Can modify remote execution code
- **Constraints**: Must maintain orchestrator compatibility

### Orchestrator Specialist
- **Purpose**: Workflow coordination, launch-and-probe logic
- **Scope**: orchestrator app, session-store, retry-policy packages
- **Authority**: Can modify orchestration logic
- **Constraints**: Must maintain client compatibility

### UI Extension Specialist
- **Purpose**: VS Code integration, user interface, command handling
- **Scope**: ui-extension app, shared-types packages
- **Authority**: Can modify extension code and VS Code integration
- **Constraints**: Must follow VS Code extension guidelines

## Agent Handoff Rules

1. **Always verify current state** via `pnpm guard:status` before starting
2. **Always validate work** via `pnpm guard:verify` before handing off
3. **Always check next allowed work** via `pnpm guard:next` before continuing
4. **Never work outside locked governance** without explicit consensus
5. **Never skip guard validation** - all work must be verifiable
6. **Never break protocol compatibility** between layers

## Emergency Override

In case of governance system failure:
1. Document the failure in CURRENT_TRUTH.md
2. Implement minimal fix to restore guard commands
3. Re-establish governance lock before continuing feature work
4. Require consensus from at least 2 agent roles for major architectural changes
