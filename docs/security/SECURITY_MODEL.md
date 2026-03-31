# Security Model

## Required controls
- Use an isolated Chrome profile per runtime session.
- Never use the default Chrome profile for CDP automation.
- Scope local browser tools narrowly.
- Keep evidence and metadata per session.
- Do not grant arbitrary local shell from browser actions.

## Current baseline enforcement
- isolated profile launch implemented
- session metadata separated per session
- no arbitrary file access exposed by browser tools
