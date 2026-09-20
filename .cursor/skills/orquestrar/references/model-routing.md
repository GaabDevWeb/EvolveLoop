# Routing de modelo (qualitativo + config)

**Âmbito:** `/evolve` (skill `orquestrar`).  
**Isto não é** uma API Cursor inventada. O raiz escolhe **qualidade relativa** por papel. O spawn usa o parâmetro `model` do Task **só se o ambiente o expuser**. Default: `inherit`.

**Config regenerável (opcional):** `karpathyWiki/rag/config/model-routing.yaml` — preferências por função (`reasoning` | `fast` | `cheap` | `strongest` | `inherit`). O Agent mapeia preference → melhor slug **listado** no Task tool desta conversa. Slug em falta → `inherit`.

**Telemetria:** após runs, `wiki-ingest metrics` / `compare --by model` avalia latency/cost/failure — **não** escolher «o modelo mais poderoso» por default; escolher pelo resultado.

---

## Default qualitativo

| Papel / função | Preference | Motivo |
|----------------|------------|--------|
| `plan`, `critic` | reasoning | decomposição / adversarial |
| `security` | strongest | ameaça / ACL |
| `exec`, `explore`, `librarian`, `documentation`, `retrieval` | fast / cheap | volume |
| `gate` | inherit | veredito auditável (mesmo do raiz) |
| raiz | o da conversa | SSOT |

**Proibido:** hardcode de slugs que o Task tool **não** listar nesta conversa. Se o modelo pedido não existir ou o spawn falhar por modelo, **repetir com `inherit`**. Não quebrar a missão.

---

## Catálogo observado (não normativo)

Listar **só** slugs que o Task tool desta conversa realmente expõe. Noutro ambiente a lista pode ser vazia — aí **só** `inherit`.

Nesta sessão (Cursor Task `model`):

- `inherit` — **default** se o utilizador não pediu outro
- `claude-opus-5-thinking-high`
- `composer-2.5-fast`
- `cursor-grok-4.5-high-fast`
- `cursor-grok-4.6-high-fast`
- `gpt-5.6-sol-medium`

Sugestão (não contrato rígido): `plan`/`critic` → o mais capaz da lista **se o spawn aceitar**; `exec` → um slug rápido da lista; `gate` → `inherit` (mesmo do raiz). Qualquer slug em falta → `inherit`.

---

## Relação

[policy-engine.md](policy-engine.md) decide **se** spawnar e com que budget. Este ficheiro decide **qualidade relativa** do filho. Sem Task `model` → tudo `inherit`. DevIntel (`rag` telemetry) mede depois — alterações de routing sob controlo humano.
