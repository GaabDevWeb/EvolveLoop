# MCPs pré-configurados (MegaBrain / CursorSKILLS)

Lista alinhada ao setup activo do autor. Sem secrets no repositório.

## Servidores incluídos

| MCP | Tipo | Notas |
|-----|------|-------|
| **context7** | `npx` | Docs actualizadas de libs |
| **playwright** | `npx` | Browser automation |
| **browsermcp** | `npx` | Browser MCP alternativo |
| **puppeteer** | `npx` | Screenshots / QA visual |
| **github** | URL + Bearer | Requer `GITHUB_PAT` |
| **sequential-thinking** | `npx` | Raciocínio estruturado |
| **filesystem** | `npx` | Requer `FILESYSTEM_ROOT` |
| **docker** | CLI | Requer Docker + `docker mcp gateway` |
| **firecrawl** | `npx` | Requer `FIRECRAWL_API_KEY` |
| **memory** | `npx` | Memória persistente MCP |
| **sentry** | URL OAuth | Autenticar no Cursor |
| **linear** | mcp-remote | Autenticar no browser |
| **railway** | URL OAuth | Autenticar no browser |

## Plugin Cursor (fora do `mcp.json`)

| Plugin | Como instalar |
|--------|----------------|
| **Figma** | Cursor → Settings → Plugins → Figma (oficial) |

## Setup rápido

```bash
cp mcp/mcp.env.example ~/.cursor/mcp.env
# editar secrets
bash scripts/install-agents-global.sh
# reiniciar Cursor
```

O instalador copia `mcp/mcp.json` → `~/.cursor/mcp.json` (faz backup se já existir) e substitui `${GITHUB_PAT}`, `${FIRECRAWL_API_KEY}`, `${FILESYSTEM_ROOT}` a partir de `~/.cursor/mcp.env` se existir.
