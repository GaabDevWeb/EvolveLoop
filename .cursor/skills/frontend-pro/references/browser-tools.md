# Browser tools — Puppeteer vs agent-browser

## Matriz de decisão

| Cenário | Ferramenta |
|---------|------------|
| localhost dev server, screenshots, viewports | **Puppeteer MCP** (`user-puppeteer`) |
| Click, fill, screenshot simples | Puppeteer MCP |
| `prefers-reduced-motion` via `emulateMediaFeatures` | Puppeteer `puppeteer_evaluate` |
| Login, multi-passo, dogfood, QA exploratório | **agent-browser** |
| Electron (VS Code, Slack, Figma desktop) | agent-browser `skills get electron` |
| Puppeteer falha (auth, CDP) | agent-browser fallback |

## Puppeteer MCP (fluxo Review)

1. Listar schema em `user-puppeteer` antes de chamar
2. `puppeteer_navigate` → URL
3. Opcional: `puppeteer_evaluate` para viewport ou media query
4. `puppeteer_screenshot` → guardar em `.frontend-review/...`
5. Repetir por viewport da matriz

## agent-browser

Antes de comandos:

```bash
agent-browser skills get core
```

Instalação se necessário: `npm i -g agent-browser && agent-browser install`

Usar para:

- Formulários longos com validação
- Fluxos autenticados
- `agent-browser skills get dogfood` para QA exploratório

## Evidência obrigatória

Review/Audit: referenciar **path do screenshot** em cada achado do relatório.

Formato: `| R-03 | P1 | contrast | .frontend-review/.../375-dark-default.png | Blocker | ... |`
