# agent-authoring — fábrica de agentes MegaBrain

Invocação **`/agent-authoring`**.

1. **Ler** `.cursor/skills/agent-authoring/SKILL.md` (contrato normativo)
2. AGENTS_ROOT: `~/.cursor/agents.env`
3. **Antes de criar ficheiros:** auditar arquitectura real (`references/architecture-audit.md`)
4. Evals comportamentais: runners isolados (não executar `with_skill` nesta sessão de authoring)
5. Fronteira: corpo/evals de skill isolada → `/skill-authoring`
