# UNKNOWNS — MCP TARGET_RESEARCH

Date: 2026-09-18  
Rule: lacuna sem fonte → UNKNOWN (não inventar).

## Access / method limits

| ID | Unknown | Why | How to resolve |
|----|---------|-----|----------------|
| U-01 | Exact TypeScript `schema.ts` field-level completeness vs prose | Spec cites schema as authoritative; this investigation used published HTML/Markdown prose, not a pinned git commit of the schema | Clone `modelcontextprotocol/specification` at tag matching 2025-11-25; diff schema |
| U-02 | Which protocol version Cursor’s MCP client implements | No Cursor proprietary docs audited; session shows MCP servers present but not version negotiation traces | Capture initialize exchange; Cursor docs/changelog |
| U-03 | MegaBrain orchestrator behaviour for `executor_types: … mcp` | Only OBSERVED string in `frontend-pro/provider.yaml`; no call graph / executor implementation audited | Code audit under `orchestrator/src` + provider execution path |
| U-04 | Whether Cursor refreshes tools on `notifications/tools/list_changed` | Host-internal | Instrument or official Cursor MCP docs |
| U-05 | Production adoption rate of Sampling / Roots / Elicitation among major hosts | Not measured | Survey host docs + MEASURED if needed |
| U-06 | Security posture of popular third-party MCP servers | Out of scope; untrusted by default | Threat model + allowlist policy experiment |
| U-07 | Timeline for 2026-07-28 draft → ratified | Changelog exists; ratification UNKNOWN | Track SEPs / release announcements |
| U-08 | How GaabWiki / Evidence Bus should canonicalize MCP resource URIs | No existing contract | PROTOTYPE + ADR |
| U-09 | Sandbox isolation for stdio MCP servers under MegaBrain | Baseline Sandbox UNKNOWN–PARTIAL | Security audit |
| U-10 | Whether Anthropic Agent Skills and MCP Prompts are intentionally complementary in product hosts | Separate OFFICIAL_EXTERNAL target | Cross-system analysis later |

## Epistemic gaps inside claims

| Claim area | Status |
|------------|--------|
| Host/Client/Server layering | DOCUMENTED — solid |
| Tools/Resources/Prompts control models | DOCUMENTED — solid |
| OAuth HTTP auth requirements | DOCUMENTED — solid (prose); CIMD vs DCR operational details partially sampled |
| Elicitation URL/form semantics | DOCUMENTED at high level; deep edge cases not fully transcribed into REPORT |
| Tasks experimental API | DOCUMENTED existence; not fully decomposed (LOW confidence on ADAPT utilities) |
| MegaBrain equivalence ratings | INFERRED from baseline + limited OBSERVED paths — re-audit may change ALREADY_PRESENT vs ADAPT |

## Conflicts (open)

1. **Stateful initialize (2025-11-25) vs stateless per-request (2026-07-28 draft)** — UNRESOLVED; dual-track.
2. **Sampling/Roots Active vs Deprecated (draft)** — UNRESOLVED for investment; DEFER recommended.
3. **Resource not-found error code** — 2025-11-25 docs cite `-32002`; 2026 draft changes to `-32602` — version-dependent.

## Explicit non-claims

- Did **not** reverse-engineer Cursor proprietary MCP router.
- Did **not** rank MCP vs OpenAPI vs LangChain tools.
- Did **not** execute untrusted MCP servers or install SDKs.
- Did **not** assert MegaBrain already “implements MCP” beyond the `executor_types` string and Cursor host usage.
