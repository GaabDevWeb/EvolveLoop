# HARD Gates Inventory

**Audit:** 2026-09-19 · AUDIT ONLY  
Policy gates are agent-instruction enforced unless noted as `runtime_enforced: true`.

---

```yaml
gates:
  - gate:
      skill: image-to-code
      trigger: user attaches any image (mockup/screenshot/wireframe/etc.)
      condition: image_attachment == true in MegaBrain context
      blocking: true
      caller: orquestrar / frontend-pro Vision / planner require / po-review reentry
      bypass: none documented ("Sem excepções")
      runtime_enforced: false
      evidence:
        - .cursor/skills/orquestrar/references/image-attachment-gate.md
        - .cursor/skills/orquestrar/SKILL.md
        - .cursor/skills/frontend-pro/SKILL.md
        - .cursor/commands/frontend-pro.md
        - .cursor/commands/MegaBrain.md
        - .cursor/skills/orquestrar/references/policy-engine.md

  - gate:
      skill: gaabwiki
      trigger: MegaBrain cycle before plan/implement
      condition: gaabwiki_grounding pending (unless skipped_trivial)
      blocking: true
      caller: orquestrar Fase 0 / /wiki / /MegaBrain
      bypass: skipped_trivial documented
      runtime_enforced: false
      evidence:
        - .cursor/skills/orquestrar/references/gaabwiki-grounding-gate.md

  - gate:
      skill: prd
      trigger: feature requiring formal product docs
      condition: docs package incomplete or not human-approved
      blocking: true
      caller: orquestrar Fase 0.5 / /prd
      bypass: narrow hotfix exception
      runtime_enforced: false
      evidence:
        - .cursor/skills/orquestrar/SKILL.md Fase 0.5
        - .cursor/commands/prd.md

  - gate:
      skill: testing
      trigger: MegaBrain Fase 3 / DoD
      condition: gate.testing.json missing or RED
      blocking: true
      caller: orquestrar / /testes
      bypass: none in standard flow
      runtime_enforced: partial  # Evidence Bus file requirement is policy+filesystem
      evidence:
        - .cursor/skills/orquestrar/references/evidence-bus.md
        - .cursor/commands/testes.md

  - gate:
      skill: debugger
      trigger: testing failed 3 times without green
      condition: retries exhausted
      blocking: true
      caller: orquestrar
      bypass: none documented
      runtime_enforced: false
      evidence:
        - .cursor/skills/orquestrar/SKILL.md
        - .cursor/skills/debugger/SKILL.md

  - gate:
      skill: systematic-debugging
      trigger: via debugger (absorbed DO)
      condition: any debug session under debugger package
      blocking: true
      caller: debugger
      bypass: none (Iron Law)
      runtime_enforced: false
      notes: ABSORBED — do not invoke as parallel agent
      evidence:
        - global-skills/systematic-debugging/PACKAGE-NOTE.md

  - gate:
      skill: security
      trigger: policy require[] includes security-review
      condition: risk_tier / surface demands it
      blocking: true when required
      caller: orquestrar / /seguranca
      bypass: not in require[] for tier
      runtime_enforced: false
      evidence:
        - .cursor/skills/orquestrar/references/policy-engine.md

  - gate:
      skill: po-review
      trigger: MegaBrain Fase 5 feature close
      condition: PO acceptance not PASS
      blocking: true before Fase 6
      caller: orquestrar / /validar
      bypass: none in standard feature close
      runtime_enforced: false
      evidence:
        - .cursor/skills/orquestrar/SKILL.md Fase 5

  - gate:
      skill: brainstorming
      trigger: when brainstorming skill is actively used
      condition: design not human-approved
      blocking: true (internal to skill)
      caller: optional upstream from orquestrar/prd
      bypass: skip brainstorming entirely (MegaBrain optional)
      runtime_enforced: false
      evidence:
        - global-skills/brainstorming/SKILL.md HARD-GATE

  - gate:
      skill: agent-browser
      trigger: /library-dossier / technical-library-dossier session
      condition: research protocol without agent-browser + Puppeteer
      blocking: true within that skill only
      caller: technical-library-dossier
      bypass: n/a for dossier; frontend-pro may use Puppeteer instead
      runtime_enforced: false
      evidence:
        - .cursor/commands/library-dossier.md
        - global-skills/technical-library-dossier/SKILL.md

  - gate:
      skill: technical-library-dossier
      trigger: user invokes /library-dossier
      condition: protocol tools missing
      blocking: true for that command path
      caller: library-dossier.md
      bypass: use /pesquisar instead (different skill)
      runtime_enforced: false
      evidence:
        - .cursor/commands/library-dossier.md
```

## Explicit verdict — image-to-code

> **`image-to-code` É um Hard Gate do sistema actual (MegaBrain policy), condicional a imagem anexada.**

Não é enforced pelo Execution Engine TypeScript (`orchestrator/src` sem matches). Remoção quebraria contratos de `orquestrar`, `frontend-pro`, commands e PO visual acceptance.
