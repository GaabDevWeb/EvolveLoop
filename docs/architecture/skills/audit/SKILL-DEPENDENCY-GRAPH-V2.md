# Skill Dependency Graph V2

**Pre-pruning:** 2026-09-19

## Canonical MegaBrain flow (CURRENT)

```text
INPUT
  ↓
ROUTING (/MegaBrain → orquestrar) + Policy require[]
  ↓
gaabwiki? [HARD Fase 0]
  ↓
brainstorming? [SOFT optional]
  ↓
/prd [HARD docs approval]
  ↓
/grill-me [HARD when require[]] ──GATES──► gate.grill-me.json
  ↓
/planejar (planner)
  ↓
PDA exec (backend | frontend-pro | …)
  ├─ image attached ──GATES──► image-to-code
  └─ visual QA ──FALLS_BACK_TO──► agent-browser (vs Puppeteer)
  ↓
/testes ──(×3 fail)──► /debugger ──ABSORBS──► systematic-debugging
  ↓
/seguranca? /code-reviewer? /validator?
  ↓
/validar (po-review)
  ↓
/documentar
```

## Parallel / non-canonical

```text
Superpowers: brainstorming → writing-plans → SDD|executing-plans → finishing
Discovery user: /descobrir → find-skills (npx skills)
Research parallel: /library-dossier → technical-library-dossier ──REQUIRES──► agent-browser
Engine miss: Registry → provider-discovery.ts scan (NOT find-skills)
```

## Highlighted edges

| Source | Rel | Target | Strength |
|--------|-----|--------|----------|
| orquestrar | GATES | grill-me | HARD conditional |
| orquestrar | GATES | image-to-code | HARD conditional |
| planner | REQUIRES | gate.grill-me.json | HARD when required |
| frontend-pro | GATES | image-to-code | HARD if image |
| frontend-pro | FALLS_BACK_TO | agent-browser | FALLBACK |
| debugger | ABSORBS | systematic-debugging | HARD source DO |
| library-dossier | REQUIRES | technical-library-dossier | HARD |
| technical-library-dossier | REQUIRES | agent-browser | HARD |
| /descobrir | DISCOVERS | find-skills | SOFT user |
| grill-me | WRAPS | (none) | self-authority v2 |
| brainstorming | DOCUMENTS | writing-plans | Superpowers only |
