# Execution Contract — Provider + Executor

**Pacote:** `contracts-v2.1.0` · **Interface:** `capability-orchestrator/execution@2.1.0`

Detalhe plugins: [specs/plugins.md](../specs/plugins.md).

---

## 1. Separação fundamental

| Papel | Responsabilidade | Analogia |
|-------|------------------|----------|
| **Provider** | *O quê* — capability, mode, briefing, DoD | Contrato de trabalho |
| **Executor** | *Como* — isolamento, recursos, transporte | Infraestrutura de execução |

```text
Capability → Provider (semântica) → Executor (transporte) → Worker (instância)
```

O Scheduler agenda **Execuções** via Executor — não Skills directamente.

---

## 2. Provider

Declara capabilities implementadas via `provider.yaml`. Não executa — delega ao Executor associado no manifest (`plugin.type`).

```yaml
# provider.yaml (extracto)
spec:
  plugin:
    type: cursor-skill          # tipo de executor
    entrypoint: SKILL.md
  capabilities:
    - id: frontend-ui
      type: worker
      modes: [build, vision]
```

---

## 3. Executor — interface `ExecutorRuntime`

```typescript
interface ExecutorRuntime {
  id: string;
  type: ExecutorType;
  execute(request: ExecuteRequest): Promise<ExecuteResult>;
  cancel(run_id: string): Promise<void>;
  health(): HealthStatus;
  capabilities(): ExecutorCapabilities;
}

type ExecutorType =
  | "cursor-skill"
  | "cursor-cloud"
  | "claude-code"
  | "openai-api"
  | "mcp"
  | "shell"
  | "docker"
  | "github-action"
  | "human";

interface ExecutorCapabilities {
  isolation: boolean;
  sandbox: boolean;
  streaming: boolean;
  local_retry: boolean;
  heartbeat: boolean;
  async_resume: boolean;
}
```

---

## 4. Executor MUST provide

| Capacidade | Descrição |
|------------|-----------|
| **Isolamento** | Processo, container ou sessão separada |
| **Retry local** | Falhas transitórias antes de reportar ao Scheduler |
| **Timeout** | Configurável por policy; abort limpo |
| **Sandbox** | Restrições filesystem/rede quando aplicável |
| **Captura de logs** | stdout/stderr → `evidence.logs` |
| **Streaming** | Progresso parcial → eventos (opcional) |
| **Cancelamento** | `cancel(run_id)` cooperativo |
| **Heartbeat** | Sinal de vida em execuções longas (`waiting`) |

Executors que não suportam uma capacidade **declaram** em `capabilities()` — o Scheduler adapta (ex.: sem heartbeat → timeout mais curto).

---

## 5. ExecuteRequest / ExecuteResult

```typescript
interface ExecuteRequest {
  run_id: string;
  node_id: string;
  capability: string;
  mode?: string;
  inputs: ResolvedInput[];
  definition_of_done: DoDCheck[];
  policy: { retries_remaining: number; timeout_ms?: number };
  memory_scope: string;
  knowledge_hits: KnowledgeEntry[];
  briefing: string;
  node: GraphNode;
  provider_id: string;
  executor_type: ExecutorType;
}

interface ExecuteResult {
  run_id: string;
  success: boolean;
  evidence?: Evidence;
  error?: { code: string; message: string };
  contextual_learnings?: MemoryEntry[];
  durable_learnings?: ProposedKnowledgeEntry[];
  duration_ms: number;
  provider_id: string;
  executor_id: string;
  execution_meta?: {
    retry_count: number;
    timeout_hit: boolean;
    cancelled: boolean;
  };
}
```

---

## 6. Execution Evidence (payload `execution`)

```yaml
payload:
  type: execution
  executor_id: string
  executor_type: string
  duration_ms: number
  retry_count: number
  timeout_hit: boolean
  cancelled: boolean
  logs:
    - path: string
      excerpt?: string
```

---

## 7. Tipos de executor (referência)

| Tipo | Uso típico |
|------|------------|
| `cursor-skill` | SKILL.md + subagente Cursor |
| `mcp` | Puppeteer, Firecrawl, Sentry |
| `shell` | pytest, npm test |
| `docker` | Sandbox reprodutível |
| `human` | Human-in-the-loop, PO manual |
| `github-action` | CI remoto |

Todos implementam a **mesma** interface `ExecutorRuntime`.

---

## 8. Referências

| Documento | Path |
|-----------|------|
| Plugins | [specs/plugins.md](../specs/plugins.md) |
| Evidence | [evidence.md](evidence.md) |
| Manifest | [specs/provider-manifest.md](../specs/provider-manifest.md) |
