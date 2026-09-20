# Evidence — hierarquia e rótulos epistémicos

## Rótulos (obrigatórios em claims relevantes)

| Label | Significado |
|-------|-------------|
| `OBSERVED` | Visto directamente em código/teste/execução controlada |
| `DOCUMENTED` | Afirmado em documentação/spec oficial |
| `MEASURED` | Benchmark/métrica reproduzível citada |
| `INFERRED` | Conclusão derivada; premissas explícitas |
| `HYPOTHESIS` | Testável; ainda sem prova suficiente |
| `OPINION` | Juízo; não usar como evidência |

Nunca apresentar `INFERRED`/`HYPOTHESIS`/`OPINION` como facto.  
Nunca usar marketing sem validação como `DOCUMENTED` técnico.

## Hierarquia de fontes (prioridade decrescente)

1. Código-fonte oficial  
2. Documentação oficial  
3. Especificações/protocolos oficiais  
4. Testes oficiais  
5. Benchmarks reproduzíveis  
6. Papers / publicações técnicas  
7. Issues e discussions do projecto  
8. Relatos técnicos de engenharia  
9. Análises independentes  
10. Comunidade  

Não usar secundária quando a primária for acessível para o mesmo claim.  
Registar fonte (URL/path/commit/versão) em claims relevantes.

## Discordância entre fontes

```text
CONFLICT:
  claim:
  source_a:
  source_b:
  difference:
  resolution: UNRESOLVED | prefer_primary | UNKNOWN
```

Não fabricar consenso.

## Popularidade ≠ mérito

Separar sempre: Technical | Product | Distribution | Ecosystem | Timing | Community | DX | Lock-in.  
Proibido: `Popular = technically superior`.
