# Target Report — `mcp`

| Campo | Valor |
|-------|-------|
| Target | Model Context Protocol (MCP) |
| Category | skills-protocol / wire protocol (Agent Skills & Tool Protocols) |
| Mode | TARGET_RESEARCH |
| Provenance | OFFICIAL_EXTERNAL |
| Versions examined | Spec **2025-11-25** (primary); draft **2026-07-28** (forward-looking); architecture learn page `docs/2025-11-25/learn/architecture`; schema referenced by spec |
| Access limitations | Docs + published specification only; no local clone of `modelcontextprotocol/specification` git tree; no runtime interception of Cursor↔MCP sessions; SDKs not executed |
| Date | 2026-09-18 |
| Epistemic baseline | Claims labelled OBSERVED (local MegaBrain paths) · DOCUMENTED (official MCP) · INFERRED · HYPOTHESIS · UNKNOWN |

**Wiki:** n/a pack (OFFICIAL_EXTERNAL protocol); comparison grounded on `research/OUR-SYSTEM-BASELINE.md` + local CursorSKILLS greps.

---

## 1. What exists?

MCP is an **open JSON-RPC 2.0 protocol** that standardises how **LLM host applications** exchange **context and capabilities** with **external servers**. It is explicitly modelled after the Language Server Protocol (LSP): one protocol, many hosts, many servers. `DOCUMENTED`

It is **not** an agent framework, not a planner, and not “tool calling” alone. Tool calling is one of three **server primitives**, alongside **Resources** (URI-addressed context) and **Prompts** (user-facing templates). Clients may also expose reverse primitives (**Sampling**, **Roots**, **Elicitation**, **Logging**). `DOCUMENTED`

**Project surface (scope):** specification, language SDKs, Inspector/dev tools, reference servers. MCP “focuses solely on the protocol for context exchange—it does not dictate how AI applications use LLMs or manage the provided context.” `DOCUMENTED` (architecture overview)

**Participants:**

| Role | Responsibility |
|------|----------------|
| **Host** | AI app (e.g. IDE, chat UI); creates clients; aggregates context; enforces consent/security; owns LLM integration |
| **Client** | One stateful connector **per** server (1:1); negotiates capabilities; routes messages; isolates servers |
| **Server** | Focused context/capability provider (local process or remote service) |

`DOCUMENTED` (specification architecture)

**Layers:**

1. **Data layer** — JSON-RPC semantics: lifecycle, primitives, notifications, utilities (progress, cancellation, pagination, tasks/experimental).
2. **Transport layer** — message framing + connection: **stdio** (local subprocess) and **Streamable HTTP** (remote/multi-client); authorization for HTTP.

`DOCUMENTED`

---

## 2. Architecture map

```text
┌──────────────────────── MCP HOST (AI application) ───────────────────────┐
│  Policy / consent UI · LLM · Context aggregation · Tool registry union   │
│                                                                          │
│   ┌──────── Client₁ ────────┐  ┌──────── Client₂ ────────┐               │
│   │ initialize / negotiate  │  │ initialize / negotiate  │               │
│   │ tools|resources|prompts │  │ …                       │               │
│   │ sampling|roots|elicit   │  │                         │               │
│   └───────────┬─────────────┘  └───────────┬─────────────┘               │
└───────────────┼────────────────────────────┼─────────────────────────────┘
                │ JSON-RPC 2.0               │
     ┌──────────┴──────────┐      ┌──────────┴──────────┐
     │ Server A (stdio)    │      │ Server B (HTTP)     │
     │ Tools / Resources / │      │ + OAuth RS (opt.)   │
     │ Prompts             │      │                     │
     └─────────────────────┘      └─────────────────────┘
```

**Design principles (spec):** servers easy to build; highly composable; **must not** read the whole conversation nor see into other servers; progressive capability negotiation. `DOCUMENTED`

**Control-plane distinction for primitives (critical — anti “everything is a tool”):**

| Primitive | Intended control | Discovery / use |
|-----------|------------------|-----------------|
| **Tools** | Model-controlled | `tools/list` → `tools/call` |
| **Resources** | Application-driven | `resources/list` → `resources/read` (+ templates, subscribe) |
| **Prompts** | User-controlled | `prompts/list` → `prompts/get` |

`DOCUMENTED` (tools / resources / prompts server specs)

---

## 3. Execution flow (or UNKNOWN)

### 3.1 Session lifecycle (2025-11-25) — DOCUMENTED

```text
Client --initialize(protocolVersion, clientCapabilities, clientInfo)--> Server
Server --InitializeResult(protocolVersion, serverCapabilities, serverInfo[, instructions])--> Client
Client --notifications/initialized--> Server
        ── Operation (only negotiated capabilities) ──
Transport disconnect / stdio SIGTERM|SIGKILL / HTTP close
```

Version negotiation: client proposes preferred version; server echoes or offers another; client disconnects if unsupported. HTTP thereafter carries `MCP-Protocol-Version`. `DOCUMENTED`

### 3.2 Typical host tool path — DOCUMENTED (data plane)

```text
Input (user / model intent)
  → Host asks Client: tools/list (paginated)
  → Server returns Tool[] {name, description, inputSchema, …}
  → Host unions tools into LLM tool surface
  → Model selects tool + arguments
  → Host consent gate (SHOULD human-in-the-loop)
  → Client: tools/call {name, arguments}
  → Server: result {content[], structuredContent?, isError?}
  → Host injects result into conversation / Evidence-like sink
Final Output (model turn or UI)
```

### 3.3 Server→Client reverse flows — DOCUMENTED

- **Sampling:** Server `sampling/createMessage` → Client/Host LLM (+ optional tool loop) → result (user SHOULD approve).
- **Elicitation:** Server requests structured or URL-mode user input mid-operation.
- **Roots:** Server `roots/list` → Client returns filesystem boundary URIs.

### 3.4 Forward draft (2026-07-28) — DOCUMENTED as *draft*, not assumed deployed

Major rewrite direction: **stateless** core (remove `initialize`/`initialized`), **`server/discover`**, **Multi Round-Trip Requests (MRTR)** replacing many server-initiated RPCs, remove protocol-level HTTP sessions, deprecate **Roots / Sampling / Logging** as core features, tasks → extension. Treat as **future hazard** for any ADOPT decision keyed only to 2025-11-25.

---

## 4. Mechanisms

| id | problem | mechanism | evidence label | utility |
|----|---------|-----------|----------------|---------|
| M-HOST-CLIENT-SERVER | Many hosts × many integrations without N×M adapters | Host manages N clients; 1:1 client↔server; server isolation | DOCUMENTED | HIGH — architectural boundary |
| M-CAPABILITY-NEGOTIATION | Optional features without brittle version forks | `initialize` exchanges capability objects; only negotiated features used | DOCUMENTED | HIGH |
| M-TOOLS-SCHEMA | Safe/structured side-effects for models | JSON Schema `inputSchema`/`outputSchema`; `tools/list`+`tools/call`; annotations untrusted | DOCUMENTED | HIGH |
| M-RESOURCES-URI | Share context without conflating with actions | URI resources + read/templates/subscribe; application-driven inclusion | DOCUMENTED | HIGH |
| M-PROMPTS-TEMPLATES | Reusable user-triggered workflows | `prompts/list`+`prompts/get` → message arrays | DOCUMENTED | MEDIUM |
| M-DISCOVERY-DYNAMIC | Capabilities change at runtime | `*/list` + `list_changed` notifications (+ pagination) | DOCUMENTED | HIGH |
| M-TRANSPORT-STDIO | Local low-latency servers | Subprocess stdin/stdout newline-delimited JSON-RPC | DOCUMENTED | HIGH (local) |
| M-TRANSPORT-HTTP | Remote multi-client servers | Streamable HTTP POST (+ optional SSE); Origin validation; sessions (2025-11-25) | DOCUMENTED | HIGH (remote) |
| M-AUTH-OAUTH | Authorize remote access on behalf of user | OAuth 2.1 + PRM (RFC9728) + AS metadata; stdio uses env creds instead | DOCUMENTED | HIGH (HTTP) |
| M-SECURITY-HOST-ENFORCED | Protocol cannot enforce trust | Consent, tool safety, sampling controls as implementor SHOULD/MUST guidelines | DOCUMENTED | HIGH — shifts burden to Host |
| M-SAMPLING | Servers need LLM without embedding provider SDKs | Client-mediated `sampling/createMessage` (+ tools-in-sampling) | DOCUMENTED | MEDIUM; **deprecated in 2026-07-28 draft** |
| M-ELICITATION | Mid-flow user input / confirmation | Client capability; form/URL modes (2025-11-25) | DOCUMENTED | MEDIUM |
| M-ROOTS | Bound filesystem ops | Client exposes `file://` roots to servers | DOCUMENTED | MEDIUM; **deprecated in 2026-07-28 draft** |
| M-UTILITIES | Long ops / abort / observability hooks | Progress, cancellation, ping, logging, pagination, tasks (exp.) | DOCUMENTED | MEDIUM |
| M-EXTENSIBILITY | Evolve without breaking core | Capability flags + `experimental`; 2026 draft adds `extensions` + feature lifecycle | DOCUMENTED | HIGH |
| M-CONTENT-MODEL | Multimodal tool/resource/prompt payloads | Content blocks: text/image/audio/resource/resource_link; structuredContent | DOCUMENTED | MEDIUM–HIGH |

---

## 5. Adoption analysis (separated)

| Factor | Notes | Label |
|--------|-------|-------|
| Technical | Clear layering, JSON-RPC familiarity, schemas, capability negotiation; HTTP auth is non-trivial; security is host-dependent | DOCUMENTED / INFERRED |
| Product | Cursor/Claude/VS Code-class hosts already act as MCP hosts — MegaBrain rides Cursor’s tool surface | OBSERVED (this Cursor session has MCP servers); INFERRED product fit |
| Distribution | Open spec + SDKs + ecosystem servers; not a MegaBrain distribution channel | DOCUMENTED |
| Ecosystem | Large server catalogue; version churn (2024→2025→2026 draft) is real risk | DOCUMENTED |
| Timing | 2025-11-25 is the practical target; 2026-07-28 may invalidate session/sampling/roots assumptions | DOCUMENTED |
| Community / DX | Inspector + SDKs; auth discovery complexity for remote | DOCUMENTED |
| Lock-in | Wire protocol reduces host lock-in for *integrations*; does not replace MegaBrain Policy/Evidence | INFERRED |

**Prohibited inference:** “MCP is popular ⇒ superior to Capability Registry.” Popularity ≠ mechanism fitness.

---

## 6. Comparison with MegaBrain (per mechanism)

Baseline: `research/OUR-SYSTEM-BASELINE.md`. Local note: `orchestrator/providers/frontend-pro/provider.yaml` lists `executor_types: [cursor-skill, mcp]` — **OBSERVED** naming only; depth of MCP executor path = **UNKNOWN** without further orchestrator audit.

### M-HOST-CLIENT-SERVER

```text
EXTERNAL_MECHANISM   Host/Client/Server isolation; host aggregates; servers cannot see full chat
PROBLEM_SOLVED       Composable external context/tools with security boundaries
OUR_CURRENT_MECHANISM Agent/Capability/Provider + Cursor host; PDA multi-agent; no first-class MCP Host role in orchestrator
EQUIVALENCE          PARTIAL
GAP                  MegaBrain does not define a portable Host security boundary for third-party servers; relies on Cursor
TRADE_OFF            Building our own Host duplicates Cursor; ignoring MCP loses ecosystem servers
EVIDENCE             DOCUMENTED MCP arch; OBSERVED Cursor as host; baseline Orchestrator IMPLEMENTED
APPLICABILITY        Integrate as consumers of Cursor-MCP, not reimplement Host
DECISION             ADAPT
Confidence           HIGH
```

### M-CAPABILITY-NEGOTIATION

```text
EXTERNAL_MECHANISM   Session capability objects (tools/resources/prompts/sampling/…)
PROBLEM_SOLVED       Feature discovery without hard-coded assumptions
OUR_CURRENT_MECHANISM Provider manifests + Capability Registry + GATE_BUNDLE / PDA roles
EQUIVALENCE          PARTIAL (static/config-time vs session-negotiated)
GAP                  No wire-level negotiate with external processes
TRADE_OFF            Full MCP client stack vs mapping MCP caps → Provider contracts
EVIDENCE             DOCUMENTED lifecycle; baseline registries IMPLEMENTED
APPLICABILITY        When speaking MCP, negotiate; map into existing registries
DECISION             ADAPT
Confidence           HIGH
```

### M-TOOLS-SCHEMA

```text
EXTERNAL_MECHANISM   tools/list + tools/call + JSON Schema + untrusted annotations
PROBLEM_SOLVED       Dynamic, schema-typed side effects for models
OUR_CURRENT_MECHANISM Capability Registry + Providers + Policy Engine + Cursor tools/MCP tools
EQUIVALENCE          SUBSTANTIAL at “typed callable” level; NONE at wire protocol
GAP                  Do not invent second Capability Registry; need Policy mapping for MCP tool consent
TRADE_OFF            Native MCP client vs stay Cursor-mediated
EVIDENCE             DOCUMENTED tools spec; baseline Capability/Policy; OBSERVED executor_types mcp flag
APPLICABILITY        Prefer Cursor mediation; if native client, wrap as Provider
DECISION             ALREADY_PRESENT (semantic) + ADAPT (wire/integration)
Confidence           MEDIUM–HIGH
```

### M-RESOURCES-URI

```text
EXTERNAL_MECHANISM   URI resources, templates, subscribe/updated
PROBLEM_SOLVED       Application-driven context injection distinct from tools
OUR_CURRENT_MECHANISM Knowledge/GaabWiki/RAG + Evidence Bus artefacts (different purpose)
EQUIVALENCE          PARTIAL (context sources exist; not URI-MCP resource protocol)
GAP                  No standard resource subscribe/list for external systems
TRADE_OFF            Map MCP resources → Knowledge/Evidence vs treat as opaque blobs for LLM
EVIDENCE             DOCUMENTED resources; baseline Knowledge PARTIAL, Evidence IMPLEMENTED
APPLICABILITY        Grounding / context loaders
DECISION             PROTOTYPE (map resources→Knowledge/Evidence gates) | DEFER full subscribe
Confidence           MEDIUM
```

### M-PROMPTS-TEMPLATES

```text
EXTERNAL_MECHANISM   User-triggered prompt templates from servers
PROBLEM_SOLVED       Packaged multi-message workflows discoverable by UI
OUR_CURRENT_MECHANISM Agent Skills (SKILL.md packages) — instruction packages, not MCP prompts
EQUIVALENCE          PARTIAL (both package reusable instructions; different discovery/runtime)
GAP                  Skills ≠ MCP prompts; conflating them loses user-control model
TRADE_OFF            Bridge MCP prompts into slash UX vs keep Skills as SSOT for MegaBrain behaviour
EVIDENCE             DOCUMENTED prompts; baseline Skills IMPLEMENTED
APPLICABILITY        Host UX feature; not replacement for skill-authoring
DECISION             DEFER (as MegaBrain core) / ADAPT only as Cursor UX bridge
Confidence           MEDIUM
```

### M-DISCOVERY-DYNAMIC

```text
EXTERNAL_MECHANISM   list + list_changed notifications
PROBLEM_SOLVED       Hot-plug tools/resources without restart
OUR_CURRENT_MECHANISM Registries mostly static; Cursor may refresh MCP tools (UNKNOWN internals)
EQUIVALENCE          PARTIAL
GAP                  Orchestrator may not react to MCP list_changed
TRADE_OFF            Polling vs notification wiring complexity
EVIDENCE             DOCUMENTED; Cursor behaviour UNKNOWN
APPLICABILITY        If native MCP client exists
DECISION             ADAPT
Confidence           MEDIUM
```

### M-TRANSPORT-STDIO / M-TRANSPORT-HTTP

```text
EXTERNAL_MECHANISM   stdio + Streamable HTTP (+ custom allowed)
PROBLEM_SOLVED       Local and remote deployment modes
OUR_CURRENT_MECHANISM Cursor launches/connects MCP; orchestrator does not own transport
EQUIVALENCE          NONE in orchestrator; SUBSTANTIAL if counting Cursor host
GAP                  Building transports inside MegaBrain is likely redundant
TRADE_OFF            Native transports = ops/security cost
EVIDENCE             DOCUMENTED transports; OBSERVED Cursor MCP tooling
APPLICABILITY        Prefer host-owned transports
DECISION             REJECT (reimplement in orchestrator) · ADOPT (via Cursor/host)
Confidence           HIGH
```

### M-AUTH-OAUTH

```text
EXTERNAL_MECHANISM   OAuth 2.1 for HTTP MCP; env creds for stdio
PROBLEM_SOLVED       Delegated auth to remote MCP resource servers
OUR_CURRENT_MECHANISM Policy Engine (authorization of capabilities) — different layer; no MCP OAuth client in baseline
EQUIVALENCE          NONE (protocol OAuth) / PARTIAL (policy as authority gate)
GAP                  Remote MCP needs OAuth client in Host, not a second Policy Engine
TRADE_OFF            Host OAuth complexity vs blocking remote servers
EVIDENCE             DOCUMENTED authorization; baseline Policy DOCUMENTED+IMPLEMENTED
APPLICABILITY        Host/Cursor responsibility
DECISION             ADOPT (host-level when remote MCP required) · REJECT (duplicate as MegaBrain Policy)
Confidence           HIGH
```

### M-SECURITY-HOST-ENFORCED

```text
EXTERNAL_MECHANISM   Spec security principles; protocol cannot enforce; annotations untrusted; consent for tools/sampling
PROBLEM_SOLVED       Bound untrusted server code/descriptions
OUR_CURRENT_MECHANISM Policy Engine + risk tiers + human gates (partial); Sandbox UNKNOWN–PARTIAL
EQUIVALENCE          PARTIAL
GAP                  Explicit “treat MCP tool descriptions as untrusted” in Policy; sandbox for stdio servers
TRADE_OFF            Stricter gates vs DX friction
EVIDENCE             DOCUMENTED security sections; baseline Sandbox UNKNOWN
APPLICABILITY        Policy + host consent
DECISION             ADAPT
Confidence           HIGH
```

### M-SAMPLING / M-ELICITATION / M-ROOTS

```text
EXTERNAL_MECHANISM   Server-initiated LLM / user / FS-boundary RPCs
PROBLEM_SOLVED       Agentic servers without embedding model keys; HITL; workspace bounds
OUR_CURRENT_MECHANISM Host LLM owned by Cursor/Agent; HITL via product; FS via tools; no MCP reverse RPC in orchestrator
EQUIVALENCE          NONE–PARTIAL
GAP                  Enabling sampling expands attack surface (prompt injection via server)
TRADE_OFF            Richer servers vs security; 2026 draft deprecates Sampling/Roots
EVIDENCE             DOCUMENTED client features + 2026 changelog deprecation
APPLICABILITY        Prefer DEFER until draft settles; elicitation may map to HITL
DECISION             DEFER (Sampling, Roots) · PROTOTYPE (Elicitation→HITL mapping only if needed)
Confidence           MEDIUM
```

### Anti-duplication check

| Temptation | Verdict |
|------------|---------|
| Second “MCP Capability Registry” | **REJECT** — use Capability/Provider Registry |
| Replace Evidence Bus with MCP Resources | **REJECT** — different contracts |
| Replace Skills with MCP Prompts | **REJECT** as SSOT |
| Native Streamable HTTP stack in orchestrator while Cursor hosts MCP | **REJECT** unless Cursor mediation proven insufficient |

---

## 7. Decisions summary

| Mechanism | Decision | Confidence |
|-----------|----------|------------|
| Host/Client/Server boundary | ADAPT (consume via Cursor Host) | HIGH |
| Capability negotiation | ADAPT (map ↔ Provider/Capability) | HIGH |
| Tools schema + call | ALREADY_PRESENT (semantic) + ADAPT (wire) | MEDIUM–HIGH |
| Resources URI context | PROTOTYPE mapping · DEFER subscribe | MEDIUM |
| Prompts templates | DEFER as core · ADAPT UX bridge | MEDIUM |
| Dynamic discovery | ADAPT | MEDIUM |
| Transports | ADOPT via host · REJECT reimplement | HIGH |
| OAuth HTTP auth | ADOPT at host · REJECT as Policy clone | HIGH |
| Host-enforced security / untrusted annotations | ADAPT into Policy | HIGH |
| Sampling | DEFER (esp. given 2026 deprecation) | MEDIUM |
| Roots | DEFER | MEDIUM |
| Elicitation | PROTOTYPE only if HITL gap proven | MEDIUM |
| Utilities (progress/cancel) | ADAPT when native client exists | LOW–MEDIUM |
| Replacing MegaBrain registries with MCP | REJECT | HIGH |

---

## 8. UNKNOWN / CONFLICTS

See `UNKNOWNS.md`.

```text
CONFLICT:
  claim: MCP connection model is stateful session with initialize
  source_a: specification/2025-11-25/basic/lifecycle.md (stateful initialize)
  source_b: specification/2026-07-28/changelog.md (make MCP stateless; remove initialize)
  difference: session handshake vs per-request _meta capabilities
  resolution: UNRESOLVED for production target; prefer_primary=2025-11-25 for current hosts; track 2026 draft for ADOPT timing
```

```text
CONFLICT:
  claim: Sampling/Roots are core client features to build on
  source_a: 2025-11-25 client specs (Active)
  source_b: 2026-07-28 changelog (Deprecate Roots, Sampling, Logging)
  difference: build vs migrate away
  resolution: DEFER heavy investment; prefer tool args / direct LLM APIs per draft guidance
```

---

## 9. Sources

Primary (official):

- https://modelcontextprotocol.io/llms.txt
- https://modelcontextprotocol.io/specification/2025-11-25/ (index, architecture, lifecycle, transports, authorization, tools, resources, prompts, sampling, roots, elicitation)
- https://modelcontextprotocol.io/docs/2025-11-25/learn/architecture
- https://modelcontextprotocol.io/specification/2026-07-28/changelog.md
- https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http.md (sampled)

Local comparison:

- `/home/gaab/Documentos/reverseEnginering/research/OUR-SYSTEM-BASELINE.md`
- `/home/gaab/Downloads/CursorSKILLS/orchestrator/providers/frontend-pro/provider.yaml` (`executor_types` includes `mcp`)

Not used as technical merit evidence: marketing blog posts, Medium explainers (may corroborate but not primary).

---

## 10. Handoff

- **Para `agent-authoring`:** If prototyping MCP→Capability mapping, design a **Provider adapter** that wraps Cursor-exposed MCP tools — do **not** add a parallel registry kind. Encode “annotations untrusted” in Policy gates.
- **Para `architect` / ADR:** Decide Host strategy: (A) Cursor-only MCP host, (B) thin MegaBrain MCP client for headless runs. Track 2026-07-28 draft before locking session/sampling designs.
- **Para future `ARCHITECTURE_GAP_ANALYSIS`:** Deep-audit orchestrator `executor_types: mcp` implementation path (currently UNKNOWN).
- **Não implementado nesta skill.**
