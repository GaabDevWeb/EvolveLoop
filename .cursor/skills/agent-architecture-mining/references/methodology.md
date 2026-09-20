# Methodology — modos, fluxo, qualidade

## Modos

| Modo | Input | Output principal |
|------|-------|------------------|
| `TARGET_RESEARCH` | nome/URL do sistema | Level 1 Target Report |
| `PATTERN_MINING` | 1+ reports/findings | Level 2 Finding(s) |
| `CROSS_SYSTEM_ANALYSIS` | mesmo mecanismo em N sistemas | Level 3 Cross-System Pattern |
| `ARCHITECTURE_GAP_ANALYSIS` | finding/pattern + audit MegaBrain | Level 4 Architecture Gap |
| `PRINCIPLE_EXTRACTION` | findings com evidência forte | entrada em `docs/AGENT_ARCHITECTURE_PRINCIPLES.md` |

## Categorias de alvo (extensível)

- Agent SDKs / Frameworks (ex.: OpenAI Agents SDK, LangGraph, AutoGen, CrewAI, PydanticAI, LlamaIndex)
- Coding Agents (ex.: Codex, Claude Code, Cursor, OpenHands, Aider, Cline, Roo, SWE-agent)
- Agent Skills / Tool Protocols (ex.: Anthropic Agent Skills, MCP)
- Outros — adicionar sem mudar a arquitectura da skill

A lista **não** implica ranking de qualidade.

## Fluxo (ordem fixa)

1. Define target  
2. Audit available evidence (acesso, versões, limitações)  
3. Collect primary sources  
4. Map architecture  
5. Decompose mechanisms  
6. Trace execution flows  
7. Identify problems solved  
8. Identify benefits  
9. Identify costs  
10. Identify failure modes  
11. Separate facts from inference  
12. Compare alternatives  
13. Compare with our architecture  
14. Identify equivalence/gaps  
15. Extract patterns  
16. Produce hypotheses when necessary  
17. Define experiments when necessary  
18. Extract principles only when evidence is sufficient  
19. Produce structured artifacts  
20. Validate artifacts  

## Critério de investigação concluída

Deve ser possível responder (ou marcar `UNKNOWN`):

```text
What exists? Why? Problem? How? Why might it work? Evidence?
Cost? When fails? Alternatives? Present in ours? Redundant?
Real gap? Investigate further? How to test?
```

## Meta-regras

```text
EVIDENCE > INTUITION
MECHANISM > MARKETETING
PROBLEM > FEATURE
EXPERIMENT > ASSUMPTION
REUSE > DUPLICATION
UNDERSTANDING > IMITATION
```

## Anti-implementação

Se o utilizador pedir «implementa X no nosso orchestrator» após um finding:

1. Produzir Level 4 + decisão (`PROTOTYPE`/`ADAPT`/…)
2. Handoff explícito para `agent-authoring` / `adr` / `architect`
3. **Não** editar runtime, skills de pipeline, registries, etc.
