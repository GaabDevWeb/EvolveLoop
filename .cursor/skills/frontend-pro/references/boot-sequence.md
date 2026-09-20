# Boot sequence

Executar antes de Build, Review, Fix ou Audit.

## 1. Detectar stack

| Sinal | Stack `--stack` |
|-------|-----------------|
| `next` em dependencies | `nextjs` |
| `react` sem Next | `react` |
| `vue` | `vue` |
| `svelte` | `svelte` |
| `tailwindcss` + HTML estático | `html-tailwind` |
| `components/ui/` + radix/shadcn | `shadcn` |
| Ambíguo | `html-tailwind` + assumir no output |

Comando:

```bash
python3 .cursor/skills/frontend-pro/scripts/search.py "<feature keywords>" --stack <stack>
```

## 2. Design system existente

- Se `design-system/MASTER.md` existe → **ler antes** de propor cores/fontes novas
- Se `design-system/pages/<page>.md` existe → override para essa página
- Se não existe e projeto é multi-página → sugerir `--persist` no Build

## 3. URL de desenvolvimento

Ordem de descoberta:

1. Utilizador forneceu URL
2. `package.json` scripts (`dev`, `start`)
3. README / `.env.example` (`PORT`, `VITE_PORT`)
4. Defaults: `http://localhost:3000` (Next), `5173` (Vite), `8080` (genérico)

**Review/Audit:** se URL desconhecida → perguntar; não inventar veredito.

## 4. Escolher modo

| Pedido | Modo |
|--------|------|
| criar, implementar, componente | Build |
| rever, está bom, QA | Review |
| landing premium, redesign art-directed | Vision |
| corrige o review | Fix |
| audit, pré-release | Audit |

## 5. Ferramenta browser

Ver [browser-tools.md](browser-tools.md).
