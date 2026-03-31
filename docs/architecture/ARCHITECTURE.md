# Architecture

## Layers

### Local Browser Runtime
Owns:
- Chrome discovery
- isolated profile launch
- CDP attachment
- browser actions
- evidence capture

### Remote Runtime
Owns:
- project detection
- process lifecycle
- health checks
- URL normalization

### Orchestrator
Owns:
- sequencing
- retry and health verification
- evidence synthesis

### Editor Extension
Owns:
- command registration
- user entrypoints
- invoking orchestrator/runtime processes

## Non-goals in the current baseline
- visual inspector panels
- replay UI
- event timelines
- full auth flows
- upload automation
