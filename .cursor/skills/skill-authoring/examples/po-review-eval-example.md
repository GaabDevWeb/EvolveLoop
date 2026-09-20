# Walkthrough: evals para `po-review`

Exemplo aplicado à skill existente em `.cursor/skills/po-review/`. Use como referência ao criar evals para skills do ecossistema AGENTS.

## Contexto da skill

`po-review` é gatekeeper adversarial na Fase 5 do orquestrador. Output obrigatório: veredito binário (`OK` | `Ajustes necessários`) + pendências estruturadas. Não implementa código nem planeia.

## evals/evals.json (proposta)

```json
{
  "skill_name": "po-review",
  "evals": [
    {
      "id": 1,
      "name": "auth-pr-aceite",
      "prompt": "O orquestrador terminou a feature de login com Google (ticket LIN-442). O plano pedia POST /auth/google com 201 e body { accessToken, refreshToken }. Os testes de integração passaram. Valida se está pronto para documentar — aqui está o diff do PR e o excerto do plano com os critérios de aceite.",
      "expected_output": "Veredito binário, comparação literal plano vs implementação, postura adversarial, sem linguagem de encorajamento",
      "files": [],
      "assertions": [
        {
          "id": "binary-verdict",
          "description": "Contém veredito exactamente 'OK' ou 'Ajustes necessários'",
          "type": "format"
        },
        {
          "id": "no-encouragement",
          "description": "Não contém 'quase pronto', 'parece bom', 'boa base'",
          "type": "structural"
        },
        {
          "id": "dod-comparison",
          "description": "Compara critérios DoD do plano com implementação observável",
          "type": "structural"
        }
      ]
    },
    {
      "id": 2,
      "name": "api-200-instead-of-201",
      "prompt": "Aceite de PO: endpoint de criação de utilizador. Plano exigia 201 Created. Implementação retorna 200 OK com o mesmo body. Testes unitários verdes. Posso fechar a sprint?",
      "expected_output": "Ajustes necessários — inconsistência de contrato HTTP é Deficiente, não detalhe",
      "files": [],
      "assertions": [
        {
          "id": "rejects-wrong-status",
          "description": "Veredito é 'Ajustes necessários' (não OK)",
          "type": "format"
        },
        {
          "id": "cites-contract",
          "description": "Menciona discrepância 201 vs 200 como bloqueio",
          "type": "structural"
        }
      ]
    },
    {
      "id": 3,
      "name": "empty-error-states",
      "prompt": "UI de listagem de projetos entregue. Happy path funciona. Estados vazio e erro mostram tela branca sem mensagem. Plano não mencionou explicitamente empty state mas o objetivo era 'lista utilizável em produção'. Dar aceite?",
      "expected_output": "Ajustes necessários — teste do utilizador cego falha em estados não-happy-path",
      "files": [],
      "assertions": [
        {
          "id": "blind-user-test",
          "description": "Julga pelo comportamento observável, não por desculpas técnicas",
          "type": "structural"
        }
      ]
    }
  ]
}
```

## trigger-eval-set.json (extracto)

```json
[
  {
    "query": "já passou nos testes e na security — preciso de aceite de produto antes de /documentar no orquestrador",
    "should_trigger": true,
    "notes": "Fase 5 implícita"
  },
  {
    "query": "está pronto para release? audita a entrega do ticket AUTH-12 contra o plano",
    "should_trigger": true,
    "notes": "sinónimo de aceite PO"
  },
  {
    "query": "escreve os testes E2E do fluxo de login com Playwright",
    "should_trigger": false,
    "notes": "implementação/testes — não po-review"
  },
  {
    "query": "planeia a migração de auth para OAuth2 com dependências entre BE e FE",
    "should_trigger": false,
    "notes": "planner — fase anterior no pipeline"
  },
  {
    "query": "revisa este PR por vulnerabilidades SQL injection e XSS",
    "should_trigger": false,
    "notes": "security — palavra 'revisa' é near-miss"
  },
  {
    "query": "o que é Definition of Done?",
    "should_trigger": false,
    "notes": "conceitual, sem entrega para auditar"
  }
]
```

## Workspace esperado

```
po-review-workspace/
└── iteration-1/
    ├── eval-auth-pr-aceite/
    │   ├── with_skill/outputs/review.md
    │   ├── without_skill/outputs/review.md
    │   ├── grading.json
    │   └── eval_metadata.json
    ├── eval-api-200-instead-of-201/
    │   └── ...
    └── benchmark.md
```

## Resultado esperado do discriminador

| Eval | with_skill | without_skill | Porquê |
|------|------------|---------------|--------|
| auth-pr-aceite | Veredito + DoD + tom adversarial | Pode aprovar genericamente ou omitir veredito | Skill impõe contrato de output |
| api-200-instead-of-201 | Ajustes necessários | Pode aceitar porque "testes passam" | Skill rejeita equivalência criativa |
| empty-error-states | Rejeita estados em branco | Pode ignorar edge cases | Teste do utilizador cego |

## Description — exemplo de exclusão near-miss

A description actual de `po-review` já inclui exclusões úteis:

> Não use para escrever/rodar testes (testing), implementar código (backend/frontend), planejar roadmap (planner), nem revisão de segurança profunda (security).

Ao optimizar triggers, manter estas fronteiras e adicionar sinónimos de aceite: "UAT de alto nível", "pronto para release", "validação requisito vs entrega".

## Lições para outras skills AGENTS

| Skill | Eval foco | Trigger near-miss típico |
|-------|-----------|--------------------------|
| `planner` | Grafo com IDs, contratos, briefings PDA | "implementa a feature" |
| `orquestrar` | Ciclo fechado, SSOT, PDA | "explica como funciona orquestração" |
| `backend` | Código + testes, não plano | "planeia a API" |
| `security` | OWASP, secrets | "revisa aceite de produto" |
