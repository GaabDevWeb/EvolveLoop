# POST-PRUNE-DEPENDENCY-GRAPH

## Hard gates (preservados)

```text
grill-me ──(conditional fail-closed)──► planner
image-to-code ──(when image)──► frontend-pro
```

## Cadeias críticas intactas

```text
/library-dossier → technical-library-dossier → agent-browser
frontend-pro → agent-browser (fallback)
frontend-pro + image → image-to-code
debugger ← systematic-debugging (DO absorvido)
/descobrir → find-skills (discovery user-facing; NÃO Registry fallback)
```

## Removidas (sem arestas ativas)

`linkedin-posts`, `gsap`, `framer-motion`, `lenis`, `hover-effects`, `particles`, `r3f-shaders`

Nenhum provider, command ou agent contract exige estas skills após a poda.

## Superpowers mid-chain (mantidas)

`writing-plans`, `executing-plans`, `subagent-driven-development`, `finishing-a-development-branch` — disposition REVIEW pré-pruning; **não** removidas nesta fase.
