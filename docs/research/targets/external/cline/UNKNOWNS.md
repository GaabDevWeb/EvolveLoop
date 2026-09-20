# UNKNOWNS — Cline (OFFICIAL_EXTERNAL)

Date: 2026-09-18  
Rule: lacunas sem fonte primária → `UNKNOWN` (não inventar).

## Access limitations

| Limitação | Impacto |
|-----------|---------|
| Sem clone local completo / sem testes executados | Claims de comportamento runtime limitados a leitura de código/docs |
| Firecrawl MCP 401 nesta sessão | Só WebFetch/curl/GitHub API |
| JetBrains plugin closed-source | Internals JetBrains = UNKNOWN |
| Enterprise admin console / SSO | Só DOCUMENTED; comportamento live UNKNOWN |
| Conta Cline / ClinePass billing paths | Não exercitados |

## UNKNOWN (mecanismos / detalhes)

| ID | Questão | Porquê UNKNOWN |
|----|---------|----------------|
| U01 | Algoritmo exacto que marca `requires_approval` em comandos (prompt? heurística? classifier?) | Docs dizem “model marks…”; sem especificação do classifier no código lido |
| U02 | Lista completa de Browser tool actions / schema no extension host actual | Visto `BrowserSession` + `BrowserActionResult`; schema completo da tool no prompt/runtime VS Code não auditado ficheiro a ficheiro |
| U03 | Paridade exacta CLI vs VS Code vs Desktop vs Kanban para Plan/Act, checkpoints, subagents | Docs afirmam partilha de core; deltas por host não medidos |
| U04 | Estratégias concretas de compaction (`basic` vs `agentic`) — parâmetros, prompts, thresholds | Existem ficheiros `basic-compaction.ts` / `agentic-compaction.ts`; conteúdo não lido em detalhe nesta passagem |
| U05 | HookEngine de 15 stages no `@cline/core` — mapa stage→efeito | Mencionado em agents README; stages não inventariados |
| U06 | Segurança sandbox de plugins (o que é bloqueado no subprocess) | ARCHITECTURE menciona sandbox + idle timeout; policy de FS/net UNKNOWN |
| U07 | Implementação exacta de Plan mode (tool filtering no core vs system prompt vs ambos) | DOCUMENTED comportamento; wiring no código VS Code/SDK não traçado linha a linha |
| U08 | Memory Bank — é mecanismo de runtime ou só best-practice docs? | Página em best-practices; integração automática UNKNOWN |
| U09 | Evals internas (`evals/`, cline-bench) — métricas e gates de qualidade | Árvore existe; resultados/metodologia não analisados |
| U10 | ACP mode — contrato e limitações vs extension | Só overview docs |
| U11 | Kanban dependency chains / auto-commit internals | Só docs de produto |
| U12 | Default `maxIterations` quando omitido | Loop permite unbounded se `undefined` (OBSERVED); default de produto por host UNKNOWN |
| U13 | Equivalência MegaBrain Policy Engine vs Auto Approve categories | Baseline PARTIAL; **GAP: needs audit of CursorSKILLS** |

## CONFLICTS

```text
CONFLICT:
  claim: Toda a acção requer aprovação explícita do utilizador
  source_a: docs.cline.bot/cline-overview ("Every action requires your explicit approval")
  source_b: docs auto-approve + YOLO; SDK permission-handling ("No policy set → enabled and auto-approved")
  difference: Default de segurança depende de host/settings/SDK wiring, não é universal
  resolution: prefer_primary_code+permission_docs; treat overview as product marketing aspiration
  status: UNRESOLVED as absolute claim — do not cite overview as technical invariant
```

```text
CONFLICT:
  claim: Nomes das built-in tools
  source_a: docs.cline.bot/tools-reference/all-cline-tools.md (bash, search, fetch_web, …)
  source_b: sdk/.../tools/constants.ts DefaultToolNames (run_commands, search_codebase, fetch_web_content, …)
  difference: aliases/docs desactualizados vs runtime SDK
  resolution: prefer_primary OBSERVED constants.ts for SDK; treat docs names as possibly legacy/UX labels
  status: UNRESOLVED for product UI labels
```

```text
CONFLICT:
  claim: Browser é capability de primeira classe do agent core
  source_a: README / auto-approve "Use the browser"
  source_b: DefaultToolNames sem browser; browser em apps/vscode/services/browser
  difference: Browser é host/IDE feature; SDK traz fetch_web_content
  resolution: prefer_primary code layout
  status: resolved_for_SDK vs IDE split — document as split, not single mechanism
```

```text
CONFLICT:
  claim: Tool set de subagents
  source_a: docs/features/subagents.md (read_file, execute_command, …)
  source_b: Current DefaultToolNames / tools-reference migration note
  difference: docs subagents ainda em vocabulário legacy
  resolution: UNRESOLVED — verify against current extension tool registry before citing names
```

```text
CONFLICT:
  claim: Agenda / tasks tool availability
  source_a: ARCHITECTURE.md describes full Agenda task queue
  source_b: Same doc: AGENDA_TODO_TOOL_ENABLED / AGENDA_UI_ENABLED temporarily disabled
  difference: Backend wired; agent-facing todo half disabled
  resolution: prefer_primary ARCHITECTURE status flags
  status: known temporary disable — do not assume agent can self-queue todos
```

## What would resolve key UNKNOWNS

1. Ler `basic-compaction.ts` / `agentic-compaction.ts` + testes `compaction.test.ts` (U04).
2. Grep Plan mode tool filter no `apps/vscode` + SDK session config (U07).
3. Traçar `requires_approval` desde schema da tool `run_commands` até prompt (U01).
4. Inventariar HookStage enum em `@cline/shared` (U05).
5. Correr (em ambiente isolado, se Lead autorizar) smoke CLI — fora do âmbito actual (forbidden: execute untrusted).
