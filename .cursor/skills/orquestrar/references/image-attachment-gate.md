# Image Attachment Gate — HARD-GATE MegaBrain

**Âmbito:** todo o ecossistema MegaBrain (`/MegaBrain`) — orquestrador, workers, gates e meta-skills.

**Skill obrigatória:** `~/.agents/skills/image-to-code/SKILL.md`  
**Provider global:** `image-to-code` · capability `visual-generation`

**Enforcement actual:** **policy / agente** (instruções + GATE_BUNDLE + Briefing) — **≠** machine-check no Execution Engine TypeScript. Remoção da skill quebraria o contrato MegaBrain mesmo sem enforcement TS.

---

## Trigger (quando aplica)

Aplica-se **sempre** que existir **qualquer imagem anexada** na mensagem do utilizador ou no contexto da tarefa delegada, incluindo:

- mockups, wireframes, exports Figma/Sketch
- screenshots de referência ou de bug visual
- fotos de UI, diagramas de interface, landings de inspiração
- qualquer ficheiro imagem colado ou carregado no chat (PNG, JPG, WEBP, GIF, SVG rasterizado)

**Não confundir** com screenshots de QA capturados pelo agente em Review/Audit — esses seguem `frontend-pro` visual-qa.  
**Confundir sim:** se o utilizador anexou a imagem, o gate aplica-se **antes** de qualquer interpretação visual livre.

---

## Regra absoluta

> **Imagem anexada → `image-to-code` é obrigatório.**  
> Nenhum agente do MegaBrain pode implementar, redesenhar ou “recriar de memória” UI a partir de anexo sem seguir essa skill.

Ordem mínima quando a imagem **já vem do utilizador**:

1. **Ler integralmente** `~/.agents/skills/image-to-code/SKILL.md`
2. **Analisar** a imagem anexada com o rigor definido nessa skill (secções, hierarquia, tokens, densidade)
3. **Implementar** (ou planear implementação) alinhado à análise — **nunca** saltar para código/HTML/CSS direto

Quando a skill exigir geração adicional de imagens (landing premium, secções em falta), seguir o workflow completo **gerar → analisar → implementar** dessa skill.

---

## Por papel no MegaBrain

| Papel | O que fazer |
|-------|-------------|
| **MegaBrain (raiz)** | Detetar anexo na entrada; registar `image_attachment: true` no SSOT; no Task Graph, marcar nós `frontend-ui` com `requires: image-to-code`; no Briefing PDA, **obrigar** leitura da skill |
| **planner** | Se houver anexo: incluir nó `frontend-ui` com nota `image-to-code obrigatório`; proibir tarefas “implementar UI sem image-to-code” |
| **frontend-pro** | **Modo Vision** automático; executar workflow `image-to-code` (não substituir por Build genérico) |
| **backend** | **Não** implementar UI a partir da imagem; delegar ou handoff para `frontend-pro` + `image-to-code` |
| **testing** | Usar anexo como referência de aceite; se o pedido for corrigir UI para bater certo com anexo, escalar `frontend-pro` + `image-to-code` |
| **security** | Anexo pode informar threat model; **não** substitui image-to-code para implementação visual |
| **po-review** | Comparar entrega vs anexo; se faltar fidelidade visual, `Ajustes` com exigência explícita de `image-to-code` |
| **documentation** | Pode incluir anexo em docs; se pedido for **construir** UI do anexo, delegar antes de documentar |
| **skill-authoring** | Novas skills de UI devem referenciar este gate |

---

## Proibições

- Implementar HTML/CSS/React “a olho” com imagem anexada visível no contexto
- `frontend-pro` Build sem passar por `image-to-code` quando há anexo
- Planner omitir `image-to-code` no plano quando há mockup anexado
- Orquestrador delegar frontend sem mencionar `image-to-code` no Briefing

---

## Evidência

Registar em `.agent_history.md` ou `run-notes`:

```text
image_attachment_gate: applied
image_to_code_skill: ~/.agents/skills/image-to-code/SKILL.md
```

Para gates visuais, evidência adicional segue `frontend-pro` Review/Audit.
