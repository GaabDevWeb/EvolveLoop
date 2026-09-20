# Changelog — wiki

## 1.2.0 — 2026-09-17

- Wave C1: formaliza specialization **Context Engineer** (`EXTEND_EXISTING_AGENT`).
- Capability `context-grounding` + `provider.yaml` + contract orchestrator.
- DO/DO NOT, frontiers vs wiki-mem (Knowledge) e Researcher (C2).
- **DO NOT CREATE** package `context-engineer` (REJECT_DUPLICATE).
- Agents espelho `Agents/Wiki.md`; evals boundary 7–9.
- Optional deps: deterministic `knowledge.search` | `knowledge.inspect` (sem duplicar bridge).

## 1.1.0 — 2026-09-17

- Paths: vault default → `/home/gaab/Documentos/gitHub/karpathyWiki` (legado `Documentos/karpathyWiki` inexistente).
- `ground.sh`: CLI actual `python -m gaabwiki search --json` (já não usa `wiki-ingest` / `rag/`).
- Packs: resolução via notas wiki (`kernelbot-rag`, `orbitbot-kernel`).
- Alinhado com degraded mode do package (`ollama_unavailable` ≠ `empty_corpus` ≠ `no_hits`).

## 1.0.0 — 2026-08-24

- Ship após iteration-2 (ship gate pass; 5× melhor vs baseline, 1× equivalente em vague).
- Ritual: CLI `ground.sh` + pack auto + template Método/Handoff + anti-vibe + clarificar sem near-miss dump.
- Evals em `evals/evals.json`; benchmarks em `wiki-workspace/iteration-{1,2}/`.

## 0.1.0 — 2026-08-24

- Draft inicial; iteration-1 falhou gate de redundância (baseline empatou 4/6).
