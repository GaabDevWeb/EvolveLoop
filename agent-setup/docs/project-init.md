# Project init

`agent init` performs:

1. **Detect** — language, tests, CI, existing `.cursor`
2. **Configure** — `.agent.yaml`, `.cursor/`, `.ai/sessions/README.md`
3. **Verify** — JSON summary of actions

Optional `--rag` hints when vault RAG exists (does not auto-index).

Prompts for deeper wiki bootstrap: `prompts/bootstrap-project.md`.
