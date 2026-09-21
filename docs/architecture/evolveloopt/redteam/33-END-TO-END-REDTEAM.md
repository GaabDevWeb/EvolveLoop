# 33 — End-to-End RED TEAM

| Project | Intent | Result |
|---------|--------|--------|
| A Happy | SE07 / SE05 | PASS deterministic |
| B Repair | SE05 negative | PASS |
| C Review catch | SE06 | PASS unit |
| D Replan | A04/SE07 | PASS deterministic |
| E Crash recovery | B04 | PASS resume / FAIL integrity |
| F Scope attack | RT harness | PARTIAL (traversal OK, symlink FAIL) |
| G Prompt injection | Ollama live + review unit | PARTIAL |
| H Parallel | limited | PARTIAL |
| I Long horizon | — | NOT_MEASURED |
| J Mixed failures | composition | PARTIAL (suite) |

**Deterministic E2E:** PASS  
**Live E2E:** NOT_MEASURED / PARTIAL (Ollama only)
