# Adapter Development Standard

**Status:** Normative for `evolve-v2`  
**Date:** 2026-09-20  
**Contract:** `AGENT_BACKEND_CONTRACT_VERSION = 1.0.0`

Every AgentBackend adapter MUST provide:

| Section | Requirement |
|---------|-------------|
| identity | backend_id, vendor, product, adapter_version, contract_version, classification |
| capabilities() | honest levels; `evolveloop_sandbox` always UNAVAILABLE until implemented |
| health() | ready / unavailable / auth_required — never fake ready |
| authenticate() | fail-closed; no secrets in return payloads |
| run() | `reasoning_only` default; `agent_runtime` ⇒ A03 LIMITED or NOT_APPLICABLE |
| error mapping | BackendErrorCode taxonomy |
| tests | contract suite via `runAgentBackendContractSuite` |
| live | separate gate; MOCK ≠ LIVE |
| limitations | documented in adapter audit |

MUST NOT:

- put vendor logic in core outside `src/backends/<id>/`
- auto-fallback to another backend
- claim vendor SUCCESS as task completion
- store API keys in Evidence or checkpoints
- scrape TUI as API

Location: `orchestrator/src/backends/`
