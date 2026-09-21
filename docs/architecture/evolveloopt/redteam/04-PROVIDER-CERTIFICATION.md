# 04 — Provider Certification

| Provider | Mode tested | Unavailable | Timeout | Malformed | Live |
|----------|-------------|-------------|---------|-----------|------|
| MockProvider | unit/integration | n/a | n/a | n/a | auto-success evidence — **dangerous if used as prod gate** |
| Deterministic FS/shell/git | unit + RT | — | — | — | PARTIAL |
| CursorReasoningProvider | unit mock + SE08 mock | auth fail closed | — | — | LIVE BLOCKED |
| OllamaReasoningProvider | live generate + chat | — | — | MALFORMED once | LIVE PARTIAL |
| Codex adapter | contract suite mock | — | — | — | LIVE BLOCKED |
| Claude Code adapter | contract suite mock | — | — | — | LIVE BLOCKED |
| Antigravity | contract / no programmatic API | — | — | — | BLOCKED |
| AutonomousSkillExecutor | A02 | — | — | malicious module risk | HIGH residual |
| CursorSkillProvider (jobs) | unit | EXTERNAL | — | — | LIMITED |

**Providers Tested:** 9  
**evolveloop_sandbox:** UNAVAILABLE on all vendor backends (documented + contract-tested).
