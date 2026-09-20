# GATE_BUNDLE — secção zero portátil (herança PDA)

**Âmbito:** todo spawn de sub-agente / sub-sub-agente no `/MegaBrain`.  
**Regra:** spawn **sem** `GATE_BUNDLE` completo = **inválido** — o filho deve recusar e devolver `[ENCERRAMENTO] bloqueado` com motivo `missing_gate_bundle`.

Isto **não** substitui a Fase 0 no tempo do raiz: é o **mesmo contrato de hard-gates** a viajar na árvore PDA.

---

## Conteúdo obrigatório do bundle

O pai (raiz ou nó intermédio) **cola** este bloco no prompt do filho (ou path + sumário se > ~2k tokens — nesse caso o filho **lê** o path primeiro).

```text
### GATE_BUNDLE
parent_cycle_id: <cycle_id do SSOT raiz>
spawn_depth: <1|2|3>
max_spawn_depth: 3
role: plan | exec | gate | explore | critic | librarian
skill_path: <SKILL.md do provider>
knowledge_grounding: pending | applied | skipped_trivial
sources: <paths ou "ver briefing Fontes">
contracts: <bullets ou "ver briefing Contratos">
gaps: <bullets ou none>
image_attachment: true | false
image_to_code_skill: ~/.agents/skills/image-to-code/SKILL.md | n/a
grill_me_required: true | false
grill_me_status: satisfied | blocked | failed | exempt | absent | n/a
grill_me_skill: ~/.agents/skills/grill-me/SKILL.md | n/a
outer_loop: cycle_id=… outer_cycle=…/… last_decision=… reentry=…
anti_vibe: coding via Agent tools — NÃO wiki vibe / Composer CLI
wiki_register: se editar código → append {Projeto}/log.md (± wiki/); NUNCA raw/; executor: librarian se spawnado, senão exec/raiz
mem_episodic: complementar LATEST.md / wiki-mem — NÃO substitui contratos
vault: /home/gaab/Documentos/karpathyWiki
```

### Campos — regras

| Campo | Regra |
|-------|--------|
| `spawn_depth` | Raiz→filho = **1**; filho→neto = **2**; neto→bisneto = **3**. Se `spawn_depth >= max_spawn_depth`, **proibido** novo spawn — executar no sítio ou subir bloqueio |
| `role` | Ver [pda-roles.md](pda-roles.md) — o filho **não** muda de papel sem novo spawn |
| `knowledge_grounding` | Se `pending` e a missão toca código/arquitectura Gaab: o filho **deve** retrieve (skill/CLI/vault) antes de editar, ou declarar GAP |
| `image_attachment: true` | Filho visual **obrigado** a `image-to-code` |
| `grill_me_required: true` | Filho `role: plan` **obrigado** a evidência `gate.grill-me.json` `satisfied|exempt` — senão `bloqueado: grill_me_gate` |
| `wiki_register` | Qualquer edit de código no filho → registo wiki (ou handoff explícito ao raiz com lista de paths). **Executor:** `librarian` se spawnado; senão `exec` / raiz. Ver [pda-roles.md](pda-roles.md) |

---

## Template — Briefing de Contexto Relâmpago (completo)

Usar **exactamente** estas secções ao spawnar:

```text
### BRIEFING RELÂMPAGO
role: <plan|exec|gate|explore|critic|librarian>
spawn_depth: <N>
parent_cycle_id: <id>

#### GATE_BUNDLE
<bloco acima>

#### Estrutura do projeto
- entrypoints:
- pastas:
- stack:
- convenções:

#### Objectivo imediato
- outcome:
- critério de fecho testável:

#### Impedimentos
- bloqueios:
- deps:
- SSOT imutável (sem subir ao raiz):

#### Âmbito permitido
- pode:
- não pode: (conforme role em pda-roles.md)

#### Entrega esperada
- formato: [ENTREGA CONSOLIDADA] + [ENCERRAMENTO]
- evidence mínima:
```

---

## Checklist pré-spawn (pai)

- [ ] `GATE_BUNDLE` completo
- [ ] `role` alinhado à capability (plan/exec/gate/explore/critic/librarian)
- [ ] `spawn_depth + 1 <= max_spawn_depth`
- [ ] Objectivo imediato testável
- [ ] Fontes/Contratos/GAPs presentes se missão Gaab / código
- [ ] Skill path correcto

## Checklist pós-spawn (filho, primeiros actos)

- [ ] Validar `GATE_BUNDLE` — senão `bloqueado: missing_gate_bundle`
- [ ] Se `knowledge_grounding=pending` e precisa contratos → retrieve
- [ ] Respeitar `role` / Âmbito permitido
- [ ] Não falar com o utilizador a contornar o raiz
- [ ] Fechar com `[ENTREGA CONSOLIDADA]` + `[ENCERRAMENTO]`

---

## Exemplo — exec spawna explore (sub-sub)

Missão do exec: alterar endpoint. Antes do patch:

1. Exec (depth=1) spawna **explore** (depth=2) com mesmo `GATE_BUNDLE` (actualizar `spawn_depth`, `role: explore`).
2. Explore: wiki/RAG + mapa de pastas/rotas → `[ENTREGA CONSOLIDADA]` (paths, contratos, GAPs).
3. Exec: patch mínimo alinhado às Fontes.
4. Raiz: **critic** (após exec, antes de testing) → gate testing / Matriz / outer loop → **librarian** no fecho wiki.

Se depth já é 3: explore **no próprio** exec (sem novo spawn) ou subir `bloqueado: max_spawn_depth`. Âmbito permitido: conforme `role` em [pda-roles.md](pda-roles.md).

---

## Referências

- Hard-gate wiki: [knowledge-grounding-gate.md](knowledge-grounding-gate.md)
- Outer loop: [outer-loop.md](outer-loop.md)
- Imagem: [image-attachment-gate.md](image-attachment-gate.md)
- Grill-me: [grill-me-gate.md](grill-me-gate.md)
- Papéis: [pda-roles.md](pda-roles.md)
