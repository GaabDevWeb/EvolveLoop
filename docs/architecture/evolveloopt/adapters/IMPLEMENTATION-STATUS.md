# Adapter implementation status (post master finalization)

**Date:** 2026-09-20

| Backend | Code | Contract tests | Live |
|---------|------|----------------|------|
| Cursor | `src/backends/cursor/` + SE-08 ReasoningProvider | PASS (mock) | NOT_MEASURED / auth-dependent |
| Codex | `src/backends/codex/` | PASS (mock); SDK optionalDependency | NOT_MEASURED |
| Claude Code | `src/backends/claude-code/` | PASS (mock); SDK optionalDependency | NOT_MEASURED |
| Antigravity | `src/backends/antigravity/` CLI | PASS (mock) | BLOCKED if `agy` missing |
| Ollama | `src/backends/ollama/` + ReasoningProvider | health probe | reasoning live NOT_MEASURED for eng quality |

Deep vendor research remains in `adapters/*-ADAPTER-AUDIT.md` (pre-implementation audits).
