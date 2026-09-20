# Decisões de duplicação e decomposição

Antes de criar ficheiros, classificar o pedido:

| Código | Quando | Acção |
|--------|--------|-------|
| `NEW_AGENT` | responsabilidade única sem overlap material | criar Agent Package |
| `EXTEND_EXISTING_AGENT` | overlap com skill/provider existente | actualizar pacote existente |
| `SPLIT_EXISTING_AGENT` | overload / misturar roles PDA | decompor + migrar |
| `MERGE_AGENTS` | dois pacotes com mesma capability/I/O | fundir; deprecar um |
| `REFACTOR_EXISTING_AGENT` | estrutura desalinhada (falta provider/contract/command) | completar pacote |
| `REJECT_DUPLICATE` | só nome novo para mesma responsabilidade | recusar criação |
| `AGENT_UNNECESSARY` | basta capability, tool, ou rule | não criar agente |
| `RESPONSIBILITY_OVERLOAD` | «faz tudo» / multi-domínio sem fronteira | recusar; propor 2+ agentes |

## Heurísticas

1. **Mesma capability id** no registry/providers → default `EXTEND` / `REJECT_DUPLICATE`.
2. **Pedido = operação determinística** (git status, search web genérico) sem papel de raciocínio → `AGENT_UNNECESSARY` (capability/tool/provider).
3. **Nome novo, DO/DO NOT iguais** a skill existente → `REJECT_DUPLICATE`.
4. **DO lista > ~5 domínios distintos** ou mistura `exec`+`gate`+produto → `RESPONSIBILITY_OVERLOAD` ou `SPLIT`.
5. **Researcher já cobre** «web search agent» → `EXTEND_EXISTING_AGENT` (ou skill research existente), não novo agente.

## Exemplos meta-eval

| Pedido | Resultado esperado |
|--------|-------------------|
| «Create Git Agent» | `AGENT_UNNECESSARY` — sem capability `git.*` tipada; usar tools/git no agente que precisa; não inventar registry git |
| «Create Web Search Agent» com Researcher/skill research existente | `EXTEND_EXISTING_AGENT` ou `REJECT_DUPLICATE` |
| «Create Universal Agent that does everything» | `RESPONSIBILITY_OVERLOAD` + decomposição por specializations |
| «Create Security Agent» sem security skill | `NEW_AGENT` **só se** audit confirmar ausência; neste repo `security` **EXISTS** → `EXTEND` / `REFACTOR` |

Sempre **pesquisar** `.cursor/skills/`, `Agents/`, `provider.yaml`, contracts antes de emitir `NEW_AGENT`.
