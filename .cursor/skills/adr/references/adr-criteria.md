# Critérios — quando criar ADR

## Merece ADR

- Escolha de SGBD ou ORM
- Padrão arquitectural (monolito vs microserviços)
- Estratégia de autenticação/autorização
- Formato de API (REST vs GraphQL vs gRPC)
- Decisão de cache ou fila
- Mudança breaking em contrato público
- Trade-off performance vs consistência

## Não merece ADR (registar noutro sítio)

- Naming de variável local
- Fix de bug sem impacto arquitectural
- Escolha de biblioteca utilitária substituível
- Formatação de código

## Teste rápido

> "Daqui a 6 meses, um dev novo precisa saber **porquê** escolhemos X?"

- Sim → ADR
- Não → comentário no PR ou nota no plano
