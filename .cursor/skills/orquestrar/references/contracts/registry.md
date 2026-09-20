# Registry Contract

**Pacote:** `contracts-v2.1.0` · **Interface:** `capability-orchestrator/registry@2.1.0`

Detalhe: [specs/registry.md](../specs/registry.md).

---

## 1. Responsabilidade

Resolver `capability → provider` por **estratégia** e telemetria. Base viva — não YAML estático passivo.

---

## 2. Interface

```typescript
interface RegistryClient {
  select(input: SelectInput): ProviderEntry;
  record_success(provider_id: string, run: ExecuteResult): void;
  record_failure(provider_id: string, run: ExecuteResult): void;
  get_capability(id: CapabilityId): CapabilityEntry;
  register_from_manifest(manifest: ProviderManifest): void;
}

interface SelectInput {
  capability: CapabilityId;
  strategy: ProviderStrategy;
  constraints?: Record<string, unknown>;
  node?: GraphNode;
  capability_version?: string;
}

type ProviderStrategy =
  | "stable"
  | "highest_quality"
  | "fastest"
  | "cheapest"
  | "experimental"
  | "priority";
```

---

## 3. Registry Evidence (payload `selection`)

Emitida **por cada** `select()`:

```yaml
payload:
  type: selection
  capability: string
  ranking_snapshot:
    - provider_id: string
      score: number
      cost: low | medium | high
      success_rate: number
      selected: boolean
  strategy_applied: string
  constraints_matched: boolean
  fallback_used?: string
```

---

## 4. Multi-provider

Uma capability pode ter **N providers**. O Scheduler pede; o Registry rankeia e devolve um. A/B via estratégia `experimental`.

---

## 5. Telemetria

Após cada run, `record_success` / `record_failure` actualiza métricas runtime. Agregação periódica → `quality_score` (ver [versioning.md](versioning.md)).

---

## 6. Referências

| Documento | Path |
|-----------|------|
| Manifest | [specs/provider-manifest.md](../specs/provider-manifest.md) |
| Scheduler | [scheduler.md](scheduler.md) |
