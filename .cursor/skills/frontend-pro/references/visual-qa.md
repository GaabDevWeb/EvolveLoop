# Visual QA — matriz de captura

## Pasta de saída

```
.frontend-review/<YYYY-MM-DD>-<page-slug>/
├── 375-light-default.png
├── 768-light-default.png
├── 1440-light-default.png
├── 375-dark-default.png      # se dark mode
├── 375-light-error.png       # Audit / quando aplicável
└── manifest.json             # opcional: lista de capturas
```

## Matriz por modo

### Review (mínima)

| Viewport | Tema | Estado |
|----------|------|--------|
| 375 | light | default |
| 768 | light | default |
| 1440 | light | default |

### Audit (completa)

| Viewport | Temas | Estados |
|----------|-------|---------|
| 375, 768, 1440 | light + dark (se app suporta) | default, loading, error, empty (quando existir na página) |

## Viewports Puppeteer

```javascript
// 375
{ width: 375, height: 812 }
// 768
{ width: 768, height: 1024 }
// 1440
{ width: 1440, height: 900 }
```

Usar `puppeteer_navigate` → `puppeteer_screenshot` (fullPage se landing longa).

## Análise

Após captura, aplicar [visual-analysis.md](visual-analysis.md) por imagem, prioridade P1→P10.

## Regressão (v1.1)

Comparar qualitativamente com pasta `.frontend-review/` anterior se existir; documentar deltas no relatório.
