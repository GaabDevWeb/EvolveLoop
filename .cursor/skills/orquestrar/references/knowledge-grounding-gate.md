# Knowledge Grounding Gate — HARD-GATE EvolveLoop

**Âmbito:** todo o ecossistema EvolveLoop (`/evolve`) — orquestrador, workers, gates e meta-skills.

**Objecto do gate:** **Knowledge grounding** via o `KnowledgeBackend` activo (default = **Wiki** vault + pipeline RAG: ingest, BM25, híbrido, LanceDB/vectores, packs, retrieve). A skill Cursor `wiki` é a implementação Context Engineer preferida — **não** o único meio.

**Arquitectura:** `Knowledge` (abstracção) → `KnowledgeBackend` → default `Wiki`.  
**Vault:** `$WIKI_ROOT` (alias `$RAG_REPO_ROOT`) — required; no hardcoded user path.  
**Backend id:** `KNOWLEDGE_BACKEND` / profile `knowledge.backend` (default `wiki`).

**Caminhos preferidos (qualquer um, por ordem):**
1. Skill Cursor `wiki` + `scripts/ground.sh` (atalho para o backend Wiki)
2. CLI vault (`python -m gaabwiki` / `WIKI_CLI_MODULE`) search / rebuild / watch
3. Leitura directa vault (`{Projeto}/wiki/`, packs `.md`) se o índice estiver down — com `GAP: índice RAG indisponível`

**Rule global relacionada:** `~/.cursor/rules/wiki-agent.mdc` (profile/surface Wiki)

---

## Trigger (quando aplica)

Aplica-se em **toda** invocação `/evolve` (skill `orquestrar`) **antes** de Fase 1 (`/planejar`) e **antes** de qualquer worker editar código, quando a missão envolve:

- implementação, refactor, bugfix, arquitectura, contratos API
- features no ecossistema Gaab (KernelBot, OrbitBot, ISS, Portifolio, Xray-Spec, karpathyWiki/rag)
- ou qualquer repo onde a wiki tenha silo / notas relevantes

**Excepção estreita (registar no SSOT):** pedido trivial sem domínio técnico (ex.: só formatar texto) → `knowledge_grounding: skipped_trivial`.

**Não confundir** com “já li o README do repo”: o gate exige **consulta ao corpus wiki/RAG**, não só ao código local.

---

## Regra absoluta

> **EvolveLoop → grounding Wiki (wiki + RAG) é obrigatório antes de planear/implementar.**  
> Nenhum agente da cadeia pode inventar contratos, paths ou arquitectura Gaab “de memória” sem evidência do vault/RAG.  
> Após editar código: **registar** na wiki (`log.md` ± páginas `wiki/`).

A skill `wiki` é **implementação preferida**, não o único meio — o que importa é o **fluxo**: retrieve → fontes/contratos/GAPs → (código) → append wiki.

---

## Ordem mínima (raiz EvolveLoop)

1. **Registar** no SSOT: `knowledge_grounding: pending`
2. **Identificar** projeto/silo (`kernelbot` | `orbitbot` | `iss` | …)
3. **Retrieve** (pelo menos um):
   - `bash ~/.cursor/skills/wiki/scripts/ground.sh pack <pack>` se mapeado
   - `…/ground.sh scout|search "QUERY" [projeto]`
   - ou `wiki-ingest --root "$RAG_REPO_ROOT" search "…" --pretty` (BM25/híbrido conforme `.env`)
4. **Complementar** com leitura directa das notas top se `confidence=low` / allow fraco
5. **Fixar** no SSOT: Fontes, Contratos, GAPs (resumo); `knowledge_grounding: applied`
6. **Só então** Fase 0.5/1 (prd/planejar) ou Fase 2 (workers)
7. **Após** edits de código: append `{Projeto}/log.md` no vault (+ páginas se contratos mudarem); **não** reescrever `raw/`

Se o índice LanceDB/JSON estiver inconsistente: tentar rebuild (`wiki-ingest …`) **ou** fallback vault + `GAP: rag_index`; **não** avançar como se o grounding fosse completo sem o declarar.

---

## Por papel no EvolveLoop

| Papel | O que fazer |
|-------|-------------|
| **EvolveLoop (raiz)** | Disparar gate na entrada; SSOT `knowledge_grounding`; Briefing PDA com Fontes/Contratos/GAPs dentro do **GATE_BUNDLE**; bloquear Fase 2 sem `applied` (salvo skipped_trivial) |
| **plan / exec / gate / explore / critic / librarian** | Herdar GATE_BUNDLE; retrieve se `pending` e missão exigir; respeitar role ([pda-roles.md](pda-roles.md)). **librarian** executa `wiki_register` se spawnado (senão exec/raiz); NUNCA `raw/` |
| **planner** | Incluir nó/nota `requires: knowledge-grounding`; plano alinhado a Contratos; marcar GAPs como riscos |
| **backend / frontend-pro / database / devops** | Consumir Contratos do briefing; não inventar endpoints; após código → pedir/confirmar registo wiki ao raiz |
| **testing** | Se falha por contrato wiki vs código, evidência deve citar fonte wiki |
| **security** | Threat model pode usar notas `security` da wiki; não substitui grounding inicial |
| **po-review** | Reprovar se entrega contradiz Contratos wiki sem GAP explícito |
| **documentation** | Preferir sync vault/`log.md` além de docs do repo; Fase 6 deve reflectir registo wiki |
| **skill-authoring** | Skills de domínio Gaab devem referenciar este gate |

---

## Packs / defaults

| Projeto | Pack | Repo típico |
|---------|------|-------------|
| kernelbot | `kernelbot-rag` | `…/GitHub/KernelBot` |
| orbitbot | `orbitbot-kernel` | `…/GitHub/OrbitBot` |

Índice: `rag/.data/` (chunks + LanceDB). Env: `rag/.env` / `RAG_REPO_ROOT`.

---

## Proibições

- `/evolve` → código sem retrieve wiki/RAG (excepto `skipped_trivial` documentado)
- Inventar API/arquitectura Gaab com índice ou notas disponíveis
- Usar `wiki vibe` / Composer CLI como substituto do EvolveLoop/Agent
- Reescrever `raw/` da wiki
- Declarar `knowledge_grounding: applied` sem listar pelo menos uma Fonte ou GAP explícito
- Fechar ciclo com edits de código **sem** entrada em `log.md` do projeto no vault

---

## Relação com memória episódica

`.ai/sessions/` (hooks `wiki-mem`) = continuidade de sessão.  
Este HARD-GATE = contratos canónicos. Ordem: **wiki/RAG primeiro**, depois opcionalmente `LATEST.md` / `mem.py search` no Briefing.

---

## Evidência (SSOT / `.agent_history.md`)

```text
knowledge_grounding_gate: applied
vault: $WIKI_ROOT
retrieve: ground.sh|wiki-ingest|vault-read
pack: <nome|none>
sources: <paths>
gaps: <…|none>
wiki_log: <path log.md actualizado|pending|n/a>
```

Task Graph (opcional): nó inicial `type: gate` capability `knowledge-grounding` antes de workers de implementação.
