# Patterns index (Level-3)

**Lead-canonical decisions:** `../CROSS-SYSTEM-ANALYSIS.md` · `../EXECUTIVE-FINDINGS.md` · `../AGENT-ARCHITECTURE-PRINCIPLES.md`  
**Hygiene:** `../CROSS-INVESTIGATION-REVIEW.md`

### ID namespaces (Lead fix 2026-09-18)

- **`P-NNN-*`** — Lead-canonical (linked from Principles / Executive).
- **`PM-NNN-*`** — Parallel-miner set (renamed from colliding `P-*` to remove number collisions). Cite by slug; overlaps noted below.

### Lead synthesis set (linked from PRINCIPLE / EXECUTIVE)

| ID | File | Decision (compressed) |
|----|------|------------------------|
| P-001 | [P-001-progressive-skill-disclosure.md](./P-001-progressive-skill-disclosure.md) | ALREADY_PRESENT package; ADAPT harness; PROTOTYPE budgets |
| P-002 | [P-002-isolated-subagent-handoff.md](./P-002-isolated-subagent-handoff.md) | ALREADY_PRESENT PDA; ADAPT isolation/ACL |
| P-003 | [P-003-mcp-via-host.md](./P-003-mcp-via-host.md) | ADOPT host / REJECT reimplement |
| P-004 | [P-004-hitl-approval-gates.md](./P-004-hitl-approval-gates.md) | ALREADY_PRESENT Policy; ADAPT adapters |
| P-005 | [P-005-plan-before-mutate.md](./P-005-plan-before-mutate.md) | ADAPT (≠ Task IR) |
| P-006 | [P-006-checkpoint-durable-resume.md](./P-006-checkpoint-durable-resume.md) | PROTOTYPE / DEFER by subtype |
| P-007 | [P-007-evidence-validation-gates.md](./P-007-evidence-validation-gates.md) | ALREADY_PRESENT; ADAPT shapes |
| P-008 | [P-008-reject-second-runtime-registry.md](./P-008-reject-second-runtime-registry.md) | REJECT embed / duplicate registry |
| P-009 | [P-009-approval-sandbox-acl-orthogonality.md](./P-009-approval-sandbox-acl-orthogonality.md) | PROTOTYPE sandbox; ADAPT orthogonality |
| P-010 | [P-010-hard-loop-cost-bounds.md](./P-010-hard-loop-cost-bounds.md) | ADAPT |
| P-011 | [P-011-lifecycle-hard-hooks.md](./P-011-lifecycle-hard-hooks.md) | ADAPT hooks→Policy |
| P-012 | [P-012-repo-structural-map.md](./P-012-repo-structural-map.md) | ADAPT (≠ RAG SSOT) |

### Parallel-miner set (`PM-*`)

| File | Theme overlap with Lead |
|------|-------------------------|
| `PM-002-plan-before-mutate.md` | ≈ Lead P-005 |
| `PM-003-isolated-subagent-contexts.md` | ≈ Lead P-002 |
| `PM-005-approval-sandbox-duality.md` | ≈ Lead P-009 |
| `PM-006-lifecycle-hooks-enforcement.md` | ≈ Lead P-011 |
| `PM-007-hard-loop-bounds.md` | ≈ Lead P-010 |
| `PM-008-context-compaction.md` | **extra** — PROTOTYPE; see EXECUTIVE gaps / GAP-002 |
| `PM-009-checkpoint-durable-resume.md` | ≈ Lead P-006 |
| `PM-010-mcp-host-boundary.md` | ≈ Lead P-003 |
| `PM-011-handoff-and-tool-acl.md` | subset of Lead P-002 / PRINCIPLE-08 |
| `PM-012-evidence-validation-gates.md` | ≈ Lead P-007 |

**Epistemic:** Pattern ≠ Principle. Aggregate `theme_presence` inflation — see EXECUTIVE-FINDINGS.
