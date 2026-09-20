# run-jobs.ts — Before Merge Analysis

Paths (actual):
- AGENTS: `orchestrator/src/cli/run-jobs.ts`
- CursorSKILLS: `orchestrator/src/cli/run-jobs.ts`

(Not `orchestrator/src/run-jobs.ts` — that path does not exist.)

## Shared portions

- CLI commands: `list | show | pickup | invoke | complete`
- `parseArgs`, `JobStore`, `invokePickup` imports
- JSON stdout contract for list/show/pickup/invoke/complete
- `resume_hint` / optional `resume_command` when `--resume-engine`

## AGENTS-only portions

- None functionally unique beyond absence of the CS evidence-file guard.
- On `complete` with `--success`, AGENTS calls `store.completeJob` without requiring `--evidence` file existence.

## CursorSKILLS-only portions

```typescript
import { existsSync } from "node:fs";
// ...
if (args.success === "true") {
  if (!args.evidence) {
    console.error("Required: --evidence <path-to-evidence.json> when --success");
    process.exit(1);
  }
  const evidencePath = resolve(args.evidence);
  if (!existsSync(evidencePath)) {
    console.error(`artifact_missing: ${evidencePath}`);
    process.exit(1);
  }
}
```

## Semantic / behavioral differences

| Behavior | AGENTS | CursorSKILLS |
|----------|--------|--------------|
| `--success` without `--evidence` | allowed | exit 1 |
| `--success` with missing evidence file | allowed (path stored anyway) | exit 1 `artifact_missing` |
| Imports jobs modules | yes | yes (targets were missing pre-sync) |

## Imports / exports

Both: `JobStore`, `invokePickup` from `../jobs/*`. Neither exports symbols (CLI entrypoint).

## Classification of delta

| Diff hunk | Classification |
|-----------|----------------|
| `existsSync` + require evidence on success + file exists check | **LEGITIMATE_CURSOR_SKILLS_DELTA** / **BUG_FIX** (hardens complete path; aligns with job-resume needing evidence file) |

## Merge decision (pre-apply)

1. **Preserve CursorSKILLS `run-jobs.ts` entirely** (do not overwrite with AGENTS).
2. Restore `src/jobs/` so CS imports resolve.
3. No AGENTS-only missing runtime code in this file.
