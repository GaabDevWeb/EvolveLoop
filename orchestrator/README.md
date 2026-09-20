# @agents/orchestrator

Execution Engine do **Orquestrador v2** — implementação TypeScript das specs em `.cursor/skills/orquestrar/references/specs/`.

## Componentes

| Módulo | Spec |
|--------|------|
| `ir/` | capability-ir.md |
| `graph/` | runtime.md |
| `events/` | events.md |
| `evidence/` | evidence.md |
| `policies/` | execution-policies.md |
| `registry/` | registry.md |
| `knowledge/`, `memory/` | knowledge-memory.md |
| `telemetry/` | telemetry.md |
| `scheduler/` | runtime.md |
| `contracts/` | contracts.md |
| `schemas/` | contracts.md, evidence.md |
| `engine/` | runtime.md |

## Uso

```typescript
import { ExecutionEngine, ProviderRouter, createMockProvider } from "@agents/orchestrator";

const router = new ProviderRouter();
router.register(createMockProvider("backend"));

const engine = new ExecutionEngine({ registry, providers: router });
const result = await engine.run({ ir, policy_id: "rapid-prototype", feature_id: "my-feature" });
```

## CLI

```bash
npm run build
npm run run-engine -- --ir tests/fixtures/login-dashboard.ir.yaml --policy rapid-prototype

# cursor-skill via job files (pickup externo)
npm run run-engine -- --ir path/to/ir.yaml --jobs-dir ./jobs

# persistência filesystem (events JSONL + knowledge + memory)
npm run run-engine -- --ir path/to/ir.yaml --data-dir ./workspace-data

# registry builder — manifests + telemetria → capability-registry.yaml
npm run registry-builder -- build \
  --manifests providers \
  --telemetry ./workspace-data/telemetry/events \
  --output registry/capability-registry.yaml

# job pickup — listar, invocar prompt, completar SkillJobs
npm run run-jobs -- list --jobs-dir ./jobs
npm run run-jobs -- invoke --jobs-dir ./jobs --prompt-dir ../.cursor/pickup
npm run run-jobs -- complete --jobs-dir ./jobs --run-id <uuid> --success --evidence path/to/evidence.json

# retomar após complete externo (checkpoint em jobs/checkpoints/)
npm run run-engine -- --ir path/to/ir.yaml --jobs-dir ./jobs --resume --feature-id <feature_id>

# polling inline enquanto agente Cursor executa skill
npm run run-engine -- --ir path/to/ir.yaml --jobs-dir ./jobs --discovery --wait-for-jobs 600000

# Hooks Cursor (AGENTS/.cursor/hooks.json):
# - stop → followup_message se job pendente
# - afterShellExecution (run-engine) → additional_context + escreve .cursor/pickup/current-job.md

# discovery runtime — registry vazio + scan skills
npm run run-engine -- --ir tests/fixtures/login-dashboard.ir.yaml --discovery --jobs-dir ./jobs --policy rapid-prototype
```

## Testes

```bash
npm install
npm test              # todos
npm run test:unit     # unitários
npm run test:integration
```

## Arquitectura

Ver [ecosystem-v2.md](../.cursor/skills/orquestrar/references/ecosystem-v2.md) (congelada) e [specs/README.md](../.cursor/skills/orquestrar/references/specs/README.md).
