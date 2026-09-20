# Erros Comuns de Código Gerado por IA

Secção dedicada quando o código auditado foi produzido ou assistido por LLM. Estes padrões são **recorrentes** — procure-os **antes** de declarar área limpa.

## Anti-padrões (checklist)

| # | Padrão IA | O que verificar |
|---|-----------|-----------------|
| 1 | Auth sem authz | Login existe; `GET /users/:id` sem ownership |
| 2 | Validação só no FE | Zod/React Hook Form sem schema no BE |
| 3 | IDs do cliente | `userId`, `orderId` no body aceites pelo BE |
| 4 | SQL por concatenação | template literals em queries |
| 5 | Secrets no código | `API_KEY = "sk-..."` hardcoded |
| 6 | Erros verbosos em prod | stack trace ao cliente |
| 7 | Upload por extensão | `.jpg` aceite sem magic bytes |
| 8 | Deps desatualizadas | versões fixadas há anos no package.json |
| 9 | Sem rate limit em login | endpoint `/login` aberto |
| 10 | SSRF em fetch helper | `fetch(userUrl)` genérico |
| 11 | PRNG fraco | `Math.random()` para tokens/sessão |
| 12 | JWT sem validar | decode sem verify; ignorar exp |
| 13 | Config dev em prod | `DEBUG=true`, CORS `*`, Swagger público |
| 14 | XSS em render | `dangerouslySetInnerHTML` com API data |
| 15 | Race ignorada | decrement stock sem transação/lock |
| 16 | `isAdmin` no FE | botão escondido ≠ endpoint protegido |
| 17 | Mass assignment | `Model.create(req.body)` |
| 18 | Preço do request | checkout usa `req.body.price` |
| 19 | Webhook sem HMAC | confia só em IP ou path secreto |
| 20 | GraphQL sem limites | introspection + depth ilimitada |

## Protocolo para código IA

1. Assumir que **validação FE existe** mas **BE pode estar ausente** — ir direto ao handler.
2. Procurar **happy path** apenas implementado; faltar edge cases de segurança.
3. Verificar se middleware de auth **existe** mas rotas sensíveis **não o usam**.
4. Comparar número de rotas com número de checagens `authorize`/`can`/`policy`.

## Evidência no relatório

Se detectar padrão IA sem exploit completo, classificar **Confiança: Muito provável** e exigir revisão do boundary server-side — não dispensar por "parece intencional".
