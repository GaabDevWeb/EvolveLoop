# Candidate Adapter Ecosystem Audit (Tier 3)

**Consulta:** 2026-09-20T19:29Z UTC  
**Objetivo:** descobrir se existe abstração universal razoável — não integração profunda.

Fontes priorizadas: docs oficiais / repos oficiais quando disponíveis. Blog comparativo usado apenas como sinal secundário (marcado).

---

## Summary Table

| Candidate | Programmatic? | CLI? | SDK? | Workspace agent? | Tool exec? | Machine-readable events? | Session lifecycle? | Vale integração futura? |
|-----------|---------------|------|------|------------------|----------|--------------------------|--------------------|-------------------------|
| Gemini CLI | YES | YES headless `-p` | ACP mode | PARTIAL | YES (`--yolo`/approval) | JSON output | LIMITED | RESEARCH / possible CLI adapter |
| Windsurf / Codeium | UNKNOWN API pública agent | IDE | UNKNOWN | IDE | IDE | UNKNOWN | UNKNOWN | RESEARCH (docs API insuficientes nesta consulta) |
| Aider | YES | YES native | N/A (CLI) | YES git-centric | YES | text/logs PARTIAL | git commits as state | RESEARCH |
| Cline | YES | CLI 2.0 headless (vendor site) | Embed SDK claimed | YES | YES | PARTIAL | PARTIAL | RESEARCH |
| Roo Code | Fork/ecosystem Cline-like | UNKNOWN | UNKNOWN | IDE | YES | UNKNOWN | UNKNOWN | RESEARCH |
| OpenHands | YES | YES | Python/TS/REST SDK | YES (+ Docker/K8s) | YES | YES events/API | YES conversations | RESEARCH — strong SDK; ACP wraps Claude/Codex/Gemini |
| Continue | LIMITED | CLI/CI checks | Weak SDK story | IDE | PARTIAL | LIMITED | LIMITED | NOT_RECOMMENDED_FOR_ADAPTER short-term |
| JetBrains AI / Junie | IDE-centric | UNKNOWN headless | UNKNOWN | IDE | IDE | UNKNOWN | UNKNOWN | RESEARCH until public agent API |
| ACP (Agent Client Protocol) | Meta-protocol | via provider CLIs | n/a | depends | depends | protocol events | depends | **Interesting universal seam** — observe, não adotar cedo |

---

## Gemini CLI

- Docs: https://google-gemini.github.io/gemini-cli/docs/cli/headless.html  
- `-p`, `--output-format json`, `--approval-mode`, `--yolo`.  
- Também ACP: `gemini --acp` (OpenHands docs).  
- Classificação: **RESEARCH** (CLI adapter viável; overlap com Antigravity/Google stack).

## Aider

- CLI-first, git auto-commit workflow.  
- Bom para scripts; eventos estruturados mais fracos que Codex/Claude SDKs.  
- Classificação: **RESEARCH**.

## Cline / Roo

- Cline: CLI headless + SDK claims (vendor site 2026).  
- Roo: derivado/ecossistema — API programática **não** verificada oficialmente nesta consulta.  
- Classificação: **RESEARCH**.

## OpenHands

- Software Agent SDK (Python + TS client + REST Agent Server).  
- Workspaces locais ou efêmeros.  
- ACP adapters para Claude Code, Codex, Gemini CLI — sugere que **ACP** pode ser um candidato a abstração transversal no ecossistema, **não** prova de que EvolveLoop deve adotá-lo agora.  
- Classificação: **RESEARCH** (alto potencial técnico; prioridade após Tier 1–2 oficiais).

## Continue / Windsurf / JetBrains

- Superfície predominantemente IDE.  
- Sem evidência suficiente de agent SDK headless estável → **NOT_RECOMMENDED_FOR_ADAPTER** até docs oficiais de automation.

---

## Universal Abstraction Finding

Não há um único contrato vendor-neutral dominante que cubra Cursor + Codex + Claude + Antigravity + Ollama.

Padrões recorrentes observados:

1. **Subprocess CLI + JSON/NDJSON** (Claude, Antigravity, Gemini, Aider).
2. **Embed SDK wrapping CLI** (Codex TS, Claude Agent SDK, Cursor SDK).
3. **HTTP chat completions** (Ollama) — reasoning only.
4. **Emerging ACP** — meta-protocol entre hosts e agents (OpenHands).

**Conclusão:** o menor denominador comum útil para EvolveLoop é um **AgentBackend** com:

- run(prompt, workspace ref) → structured result + optional event stream  
- capability discovery  
- cancel  
- vendor session id **opcional** (não canónico)

Não é ACP-first nesta fase (maturity/adoption uneven).

---

## Recommendation for Tier 3

Não implementar adapters Tier 3 antes de:

1. Contrato AgentBackend aprovado.
2. Cursor (reference) + um SECONDARY (Codex ou Claude) green.
3. Reavaliar OpenHands/ACP como candidato de interoperabilidade, não como core.
