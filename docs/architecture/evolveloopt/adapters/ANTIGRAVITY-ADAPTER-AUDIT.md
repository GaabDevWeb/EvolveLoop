# ANTIGRAVITY — Adapter Audit

**Consulta:** 2026-09-20T19:29Z UTC  
**Fontes oficiais:**  
- https://antigravity.google/docs/cli/headless/  
- https://www.antigravity.google/docs/sdk/overview  
- https://ai.google.dev/gemini-api/docs/antigravity-agent  
- https://ai.google.dev/gemini-api/docs/managed-agents-quickstart

---

## Identity

| Campo | Valor |
|-------|-------|
| Vendor | Google |
| Product | Antigravity (IDE/CLI local + Managed Agent cloud + Python SDK) |
| Interfaces | CLI `agy`; Python SDK `google.antigravity`; Gemini Interactions API |
| Maturity | CLI headless: **Public docs / Stable surface**; Managed agent id `antigravity-preview-05-2026` → **Preview**; Python SDK: **Public** |

---

## Invocation

| Canal | Status | Nota |
|-------|--------|------|
| CLI headless `-p` | SUPPORTED | `json` / `stream-json` |
| Python SDK Agent | SUPPORTED | Local harness |
| Gemini Interactions API | SUPPORTED | `environment=remote`, managed agent |
| TypeScript SDK nativo | UNAVAILABLE nesta consulta | Sem TS oficial encontrado |
| TUI only | N/A | Headless documentado — **não** BLOCKED |

**PROGRAMMATIC_ADAPTER:** **NOT BLOCKED** — CLI + Python SDK + HTTP API existem.  
Para orchestrator Node: preferir **B — CLI Adapter** ou **C — API Adapter** (managed); Python SDK exigiria bridge.

---

## Runtime Model

1. **Local CLI agent** — cwd host, tools locais, conversas.
2. **Local Python SDK** — binary discovery, tool execution, policies, subagents.
3. **Cloud managed** — Linux sandbox Google-hosted; `environment_id` + `interaction.id`.

Não tratar os três como semanticamente idênticos no contrato.

---

## Authentication

| Path | Auth |
|------|------|
| CLI | Interactive `agy` login once; depois headless |
| Python SDK | API key config |
| Gemini API | API key / AI Studio / Vertex (`vertex=True`) |

Headless sem login prévio: soft-fail / stderr auth prompts (docs).

---

## Workspace

- CLI: current cwd; tools `write_to_file`, `run_command`, etc.
- Managed: remote sandbox FS; download artifacts via API.
- Multi-directory: UNKNOWN.

---

## Agent Lifecycle

| Op | CLI | Cloud API |
|----|-----|-----------|
| run | `agy -p "..."` | `interactions.create` |
| stream | `--output-format stream-json` | stream response |
| continue | `--continue` / `--conversation ID` | reuse interaction/environment ids |
| stdin multi-turn | `--input-format stream-json` | multi-turn API |
| timeout | `--print-timeout` (default 5m) | API timeouts |

---

## Tool Model

- Built-ins: ask_permission, run_command, write_to_file, …
- Permissions: `request-review` default; `--dangerously-skip-permissions` → `always-proceed`.
- `--sandbox` terminal restrictions.
- Managed: code_execution, google_search, url_context, filesystem, custom functions, MCP.
- Subagents: `subagent_info` em stream events.

---

## Streaming

- NDJSON: `init`, `step_update`, `result`.
- Tool steps com `tool_info`; usage tokens nos steps.

---

## Structured Output

- `--json-schema` no CLI headless — SUPPORTED.
- Managed/custom: function calling + schemas.

---

## Context / Subagents / Model

- `--agent`, `--model`, thinking levels.
- Subagents nativos com conversation_id próprios.
- Skills / SKILL.md no Python SDK.

---

## Usage / Cancellation / Recovery

- Usage tokens no envelope JSON — SUPPORTED.
- Cancel: process kill CLI; API cancel UNKNOWN detalhe.
- Resume: conversation_id / environment_id — vendor-local.

---

## Sandbox

| Vendor local | `--sandbox` flag |
| Vendor cloud | Remote Linux sandbox (managed) |
| EvolveLoop | NOT_IMPLEMENTED |

---

## Security

- `--dangerously-skip-permissions` high risk.
- Managed agent: privilege dentro sandbox Google — ainda pode exfiltrar via web tools.
- Shell tools locais = A03 bypass se não observados.

---

## EvolveLoop Compatibility

| Path | Fit |
|------|-----|
| CLI JSON | Bom para AgentBackend no Node |
| Managed cloud | Workspace ≠ EvolveLoop workspace — portability baixa |
| Python SDK | Forte, mas stack mismatch com orchestrator TS |

---

## Gaps

| Gap | Evidence | Confidence |
|-----|----------|------------|
| Sem TypeScript SDK oficial | docs SDK = Python | HIGH |
| Preview managed agent id | `antigravity-preview-05-2026` | HIGH |
| Três runtimes distintos | CLI / SDK / API | HIGH |
| `agy` não no PATH local | probe | HIGH |
| Auth interativa pré-headless | docs | MEDIUM |

---

## Adapter Strategy

**B — CLI Adapter** (Node orchestrator) **ou** **C — API Adapter** (managed).  
**D — Hybrid** se cloud+local forem ambos first-class.

Não forçar ReasoningProvider: Antigravity é **full agent runtime**.

**Classification:** **EXPERIMENTAL** — programático existe, mas fragmentação local/cloud/Python e preview IDs.
