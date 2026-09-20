# Drift Repair Report — Pre-Pruning

**Date:** 2026-09-19  
**Skills removed:** 0

## Classification legend

`REAL_BUG` | `DOCUMENTATION_DRIFT` | `STALE_REFERENCE` | `MISSING_PRIMITIVE` | `OPTIONAL_REFERENCE` | `INTENTIONAL_TIER3_BEHAVIOR` | `UNKNOWN`

| ID | Finding | Class | Canonical source | Action taken |
|----|---------|-------|------------------|--------------|
| D1 | Docs: find-skills = Scheduler fallback; TS scans provider.yaml | DOCUMENTATION_DRIFT | `provider-discovery.ts` | Docs + find-skills SKILL + `/descobrir` clarify user-facing only |
| D2 | `/descobrir` documented but missing | STALE_REFERENCE | orquestrar table | **Created** `.cursor/commands/descobrir.md` |
| D3 | grill-me → grilling ABSENT | MISSING_PRIMITIVE | Case C | **grill-me** became operational authority (v2.0.0); no separate grilling skill |
| D4 | grill-me optional vs desired HARD | REAL_BUG (policy gap) | product intent | grill-me-gate.md + policy require[] + fail-closed |
| D5 | correction-loop → systematic-debugging | DOCUMENTATION_DRIFT | debugger PACKAGE-NOTE | Point to `/debugger` |
| D6 | ecosystem finishing-a-development-branch as MegaBrain close | DOCUMENTATION_DRIFT | orquestrar Fase 5–6 | Narrative → po-review/documentar |
| D7 | ecosystem plan-execution → executing-plans | DOCUMENTATION_DRIFT | PDA exec | Document PDA workers as canonical |
| D8 | image-to-code optional:true in provider-manifest example | DOCUMENTATION_DRIFT | image-attachment-gate | Left example with note in V2; gate docs now explicit policy≠TS |
| D9 | events.md ProviderDiscoveryStarted ← find-skills | DOCUMENTATION_DRIFT | execution-engine emits engine | Accepted INTENTIONAL rename debt — noted; not rewritten wholesale |
| D10 | technical-library-dossier ↔ researcher auto-link | OPTIONAL_REFERENCE | parallel flows | Confirmed separate; preserved |
| D11 | Superpowers mid-chain as MegaBrain | DOCUMENTATION_DRIFT | orquestrar | Explicit PARALLEL not canonical |
| D12 | agent-architecture-mining missing ~/.agents symlink | UNKNOWN / install gap | install script | Not fixed this phase (install concern) |

## Decisions

### find-skills

```text
find-skills = user-facing discovery
orchestrator provider miss = provider.yaml scan
```

No hybrid. No TS implementation of find-skills as fallback.

### systematic-debugging

```text
methodology/knowledge = global-skills/systematic-debugging
operational authority = debugger
```

### grill-me

```text
Case C: grill-me is the authority (embeds design-tree methodology)
HARD-GATE conditional + fail-closed before planner
```

### image-to-code

Unchanged HARD-GATE. Explicit `policy ≠ TS enforcement`.
