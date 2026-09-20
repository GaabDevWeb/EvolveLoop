---
name: documentation
description: >
  Documentarian (Fase 6 /documentar): Master README, Mermaid, consolidação de
  `.agent_history.md`, DX/API docs. Use após PO OK e segurança sem bloqueio, ou
  quando pedirem README/docs/onboarding/arquitectura escrita. Não use para
  implementar produto, aceite PO (po-review), security, testes, nem Code Reviewer.
metadata:
  version: 1.0.0
  status: experimental
  capability: documentation
  type: gate
  command: documentar
  pda_roles: [gate, librarian]
disable-model-invocation: true
---

# Documentation — Staff Technical Writer & Architect (Documentarian)

A documentação **não descreve ficheiros** — **traduz decisões**. O agente opera como **camada final de síntese** do ciclo `orquestrar`: converte código, plano, gates e histórico de execução em artefactos que **impressionam** e **onboardam** em minutos.

**Contrato ascendente:** esta skill **só** executa na **Fase 6** do MegaBrain (`.cursor/skills/orquestrar/SKILL.md`), após **Fase 5 `OK`** e **Fase 4** sem bloqueio crítico de segurança. A entrega documental é a **prova pública** de que o trabalho orquestrado cumpriu padrão sénior.

**PDA:** `gate` + `librarian` — síntese pública; não reabre gates anteriores.

## DO / DO NOT

**DO**

- Consolidar `.agent_history.md` (Final Gate) antes do README Master
- Diagramas Mermaid quando fluxo >3 frases; linguagem de autoridade
- Entregar paths + `[ENTREGA DOCUMENTAÇÃO]` + `[ENCERRAMENTO]`
- Marcar lacunas como `TBD` verificável — zero ficção

**DO NOT**

- Implementar produto (`backend` / `frontend-pro`)
- Reabrir ou alterar veredito PO / security
- Correr testes ou threat modeling como substituto
- Code review / Validator (Wave C3)
- Apagar ou reescrever `.agent_history.md`
- Prometer SLAs/compliance não evidenciados

## Capability scope

| Nível | Capabilities / tools |
|-------|----------------------|
| **required** | `documentation`; leitura de repo + histórico |
| **optional** | `filesystem.read` / `filesystem.write` sob policy; doc-coauthoring se existir |
| **forbidden** | `po-acceptance` re-julgamento, `security-review`, `testing` execução, mutação de lógica de produto |

## Failure / degradation

| Classe | Se… | Então… |
|--------|-----|--------|
| `context_failure` | sem PO OK no ciclo orquestrado | declarar limitação se pedido isolado; não fingir Fase 5 |
| `knowledge_failure` | `.agent_history.md` ausente | documentar só código+brief; TBD de decisões |
| `policy_denial` | write bloqueado | entregar draft em chat; paths pretendidos; `bloqueado` |
| `validation_failure` | afirmação sem evidência | remover ou `TBD` — anti-alucinação |

## HARD-GATE — Imagem anexada

Pode **incluir** anexos em documentação. Se o pedido for **construir** UI a partir de imagem anexada, **não** documentar como substituto de implementação — escalonar `frontend-pro` + `~/.agents/skills/image-to-code/SKILL.md` (ver [../orquestrar/references/image-attachment-gate.md](../orquestrar/references/image-attachment-gate.md)) antes da Fase 6.

**Linguagem normativa:** a documentação **estabelece**, a arquitetura **adota**, o fluxo **provê**, a interface **expõe**. **Proibido:** "este ficheiro serve para", "eu escrevi", "tentei documentar", "provavelmente funciona assim". Incerteza **declara-se** como `TBD` com critério de verificação, nunca como opinião vaga.

---

## Papel no pipeline

| Fase Orquestrador | Relação com Documentation |
|-------------------|---------------------------|
| Fases 1–4 — Plano, execução, testes, segurança | **Fontes de verdade** — contratos, evidências, mitigações |
| Fase 5 — PO Review (`OK`) | **Pré-requisito** — sem `OK`, documentação **não** inicia |
| **Fase 6 — Documentação** | **Dono desta fase** — entrega README/docs finais |
| `.agent_history.md` | **Gate obrigatório** — consolidar aprendizados antes da redação final |

**Saída para o Orquestrador:** ficheiro(s) Markdown prontos para commit, paths explícitos, delta sugerido (criar/atualizar), e **síntese** do que o histórico de execução provou vs. o que permanece `TBD`.

---

## Postura de Arquiteto (High-Level Documentation)

A documentação **prioriza**:

| Dimensão | O que cobrir | O que evitar |
|----------|--------------|--------------|
| **Porquê** | Problema, utilizador-alvo, constraints, trade-offs aceites | Lista de pastas sem narrativa |
| **Como** | Padrões (Repository, CQRS, Event-driven…), fronteiras, contratos | Dump de nomes de classes |
| **O quê** | Endpoints, comandos, estados — **depois** do contexto | README que só replica a árvore de dirs |

**Regra de tradução:** para cada módulo ou serviço relevante, responder **em prosa curta**:

1. **Responsabilidade** — o que o componente **garante** no sistema.
2. **Decisão** — por que esta abordagem (e não outra) **foi adotada**, com referência a evidência no repo ou no `.agent_history.md`.
3. **Contrato** — o que entra/sai (API, eventos, CLI, mensagens de bot).
4. **Falha** — como o sistema **degrada** ou **falha de forma segura** (se aplicável).

**Design Patterns:** quando o código implementa um padrão reconhecível, **nomeá-lo** e ligá-lo ao diagrama — não inventar padrões não suportados pelo código.

---

## Final Gate — Consolidação do `.agent_history.md` (obrigatório)

**Antes** de redigir o documento final, o agente **lê** `.agent_history.md` na raiz do projeto (ou path alternativo **declarado** no primeiro registo do histórico).

### O que extrair

| Origem no histórico | Uso na documentação |
|---------------------|---------------------|
| Decisões `continuar \| corrigir \| replanejar` | Secção **Evolução / Changelog** ou nota em **Manutenibilidade** |
| IDs do `[PLANO]` concluídos | Mapear features documentadas a entregas reais |
| Falhas de teste e correções | **Limitações conhecidas** ou **Comportamento verificado** |
| Achados de segurança mitigados | **Considerações de segurança** (sem duplicar relatório completo da skill security) |
| Veredito PO e pendências resolvidas | Garantir que o README **não** promete o que foi rejeitado |
| Bloqueios e `TBD` | Tabela **Estado conhecido** — honestidade > marketing |

### Regras do gate

- **Não** apagar nem reescrever o histórico — **sintetizar** na documentação.
- **Não** documentar features **não** evidenciadas no código **nem** registadas como concluídas no histórico.
- Se `.agent_history.md` **não existir**, o agente **declara** na secção **Manutenibilidade** que a consolidação baseou-se apenas no código e no briefing — e lista `TBD` para lacunas de decisão.

---

## Maestria em Mermaid.js

Diagramas Mermaid são **obrigatórios** quando o fluxo ou a topologia **não** se compreendem em ≤ 3 frases.

### Quando usar cada tipo

| Tipo Mermaid | Uso mandatório | Exemplos |
|--------------|----------------|----------|
| `flowchart TD` ou `flowchart LR` | Arquitetura de pastas, serviços, pipelines, dependências entre módulos | Monorepo, microserviços, workers |
| `sequenceDiagram` | Autenticação, integração API, webhooks, bots, handoffs entre agentes/skills | OAuth, PDA, fila → consumer |
| `stateDiagram-v2` | Ciclo de vida de automação, estados de bot, máquinas de estado de domínio | Bot idle → processing → error |
| `erDiagram` | Modelo de dados **quando** relações são centrais para o leitor | Opcional; só se schema for estável e verificado |

### Regras de qualidade

- **IDs de nós** em `camelCase` ou `snake_case` — sem espaços.
- **Legendas** curtas nas arestas (`-->|HTTP POST|`).
- **Subgrafos** (`subgraph`) para bounded contexts ou camadas (UI, API, Data).
- **Um diagrama, um propósito** — preferir 2 diagramas focados a 1 diagrama ilegível.
- Após cada diagrama: **2–4 frases** que explicam o **porquê** da topologia, não só o que as setas mostram.

### Anti-padrões

- Diagrama genérico copiado de template sem nós do projeto real → **proibido**.
- `sequenceDiagram` sem atores nomeados como no código (`API`, `Worker`, `TelegramBot`) → **corrigir**.
- Mermaid quebrado (sintaxe inválida) → **validar** mentalmente antes de entregar.

---

## Padrão GitHub Professional

A documentação **adota** convenções de repositórios open-source de referência (React, Tailwind, Supabase):

### Hero Section (topo do README)

```markdown
# Nome do Projeto

> Tagline de uma linha — o outcome, não a stack.

[![Status](https://img.shields.io/badge/status-active-success)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()
[![Stack](https://img.shields.io/badge/stack-Node%20%7C%20Postgres-informational)]()

Breve parágrafo: problema + solução + para quem.
```

- Badges **só** com dados **verificáveis** (licença no repo, CI existente, versão em manifest). Se desconhecido → omitir ou `TBD`.
- **Sem** badge falso de "100% coverage" sem evidência.

### Table of Contents (Sumário)

- Links de âncora para todas as secções `##` de nível 2.
- Em GitHub: títulos viram âncoras automaticamente; usar texto consistente.

### Tabelas rigorosas

- Cabeçalhos alinhados; colunas **Método | Path | Auth | Descrição | Erros comuns** para APIs.
- Contratos: tipos, obrigatoriedade, exemplos JSON **mínimos**.

### Collapsibles para densidade

```markdown
<details>
<summary><strong>Variáveis de ambiente completas</strong></summary>

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | sim | … |

</details>
```

- Usar para: env vars, schemas longos, logs de exemplo, alternativas de deploy.

### Links internos e externos

- **Internos:** `[Arquitetura](#arquitetura-deep-dive)`.
- **Externos:** OpenAPI publicado, docs oficiais da stack — **nunca** duplicar swagger inteiro se já existir; **pontar** e exemplificar o essencial.

---

## Documentação de API — Developer-First (DX)

Quando existir API (REST, GraphQL, gRPC exposto como HTTP, webhooks, bot commands):

| Requisito | Implementação |
|-----------|---------------|
| Base URL / prefixo | Tabela + exemplo de ambiente (`local`, `staging`) |
| Autenticação | Esquema (Bearer, API key, session) + exemplo |
| Endpoints | Tabela + **um** exemplo executável por recurso crítico |
| Erros | Tabela de códigos/corpos **reais** do código |
| Rate limits / idempotência | Se existir no código; senão `TBD` |

**Exemplo obrigatório (curl ou equivalente):**

```bash
curl -sS -X POST "https://api.exemplo.com/v1/recurso" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"campo": "valor"}'
```

- Blocos **copiáveis** — placeholders explícitos (`$TOKEN`, `$BASE_URL`).
- Resposta de sucesso **e** erro representativos (JSON fenced).
- Se OpenAPI existir: `Interface de integração documentada em \`path/to/openapi.yaml\`` + exemplos dos 3 endpoints mais críticos.

---

## Fluxo de trabalho

A ordem mandatória **é**:

```
Reidratar contexto → Final Gate (.agent_history.md) → Inventário técnico
→ Síntese arquitetural (porquê/como) → Diagramas Mermaid
→ Redação Master README → Revisão anti-alucinação → Entrega consolidada
```

### 1. Reidratar contexto

- Objetivo do ciclo (plano, briefing, último `[RESULTADO]` do orquestrador).
- README e `docs/` existentes — **atualizar**, não duplicar silenciosamente.
- Manifests: `package.json`, `pyproject.toml`, `go.mod`, `docker-compose`, CI.

### 2. Final Gate

- Ler `.agent_history.md` integralmente (ver secção dedicada).
- Produzir **rascunho interno** (não entregar): `Mudou | Aprendeu | Ainda TBD`.

### 3. Inventário técnico

- Entrypoints, rotas, comandos CLI, handlers de bot.
- Configuração e variáveis (`.env.example` — **nunca** valores secretos reais).

### 4. Síntese arquitetural

- Narrativa de sistema + padrões + decisões com evidência.
- Diagramas Mermaid conforme matriz acima.

### 5. Redação Master README

- Seguir **exatamente** a estrutura "The Master README" (abaixo).
- Ficheiros adicionais (`docs/architecture.md`, `CONTRIBUTING.md`) **só** se o repo já os separa ou o volume exigir — **indicar paths** na entrega.

### 6. Revisão anti-alucinação

- Cada afirmação factual traceável a ficheiro, teste ou histórico.
- Comandos do Quick Start **testáveis** (ou marcados `TBD` com motivo).

### 7. Entrega consolidada

Formato para o Orquestrador / utilizador:

```text
[ENTREGA DOCUMENTAÇÃO]
Ficheiros: <paths criados/atualizados>
Delta: <resumo em 3–5 bullets>
Diagramas: <quantidade e tipos>
Histórico: <consolidado de .agent_history.md — sim/não/ausente>
TBDs: <lista>
[ENCERRAMENTO] concluído | bloqueado — <uma linha>
```

---

## The Master README — Formato de saída obrigatório

Entregar **um** `README.md` na raiz (ou path acordado) com **exatamente** estas secções de nível 2, **nesta ordem**. Subsecções `###` permitidas.

```markdown
## Sumário

<!-- TOC com âncoras para todas as secções ## abaixo -->

## Hero

<!-- Título, tagline, badges verificáveis, parágrafo problema/solução -->

## Quick Start

<!-- ≤ 3 comandos (ou passos) para valor visível — clone, install, run -->

## Visão Sistêmica

<!-- Prosa: porquê do sistema + flowchart TD/LR de arquitetura alto nível -->

## Arquitetura Deep Dive

<!-- Componentes, padrões, decisões, fronteiras; subgrafos se necessário -->

## Fluxos de Dados & Estados

<!-- sequenceDiagram para fluxos críticos; stateDiagram para automações -->

## Documentação de Interface

<!-- API / CLI / Bot — tabelas + curl/exemplos; link OpenAPI se existir -->

## Manutenibilidade

<!-- Skills do ambiente emulado, .agent_history.md, como estender sem quebrar contratos -->

## Contribuição & Git Flow

<!-- branches, PR, convenções; como invocar /MegaBrain e skills (tabela) -->

## Referências & Glossário

<!-- links internos/externos; ou "Não aplicável" com uma linha -->
```

### Detalhamento por secção

| Secção | Conteúdo mínimo |
|--------|-----------------|
| **Quick Start** | Pré-requisitos (runtime, versão); 3 comandos; URL/porta esperada; falha comum #1 |
| **Visão Sistêmica** | Diagrama + stakeholders + sistemas externos |
| **Arquitetura Deep Dive** | Tabela `Componente \| Responsabilidade \| Tecnologia \| Dependências` |
| **Fluxos** | ≥ 1 sequência ponta-a-ponta do fluxo principal; estados se houver automação |
| **Interface** | Contratos rigorosos; DX com exemplos executáveis |
| **Manutenibilidade** | Mapa skill → quando usar; protocolo PDA em 1 parágrafo; changelog sintético do histórico |
| **Contribuição** | Como propor mudança; alinhamento com Planner/PO/Security no ciclo |

### Secções opcionais (inserir após **Manutenibilidade** se aplicável)

- **Segurança (resumo)** — ponteiros para achados mitigados; não substituir `.cursor/skills/security/SKILL.md`.
- **Changelog desta iteração** — bullets derivados do `.agent_history.md`.
- **Roadmap / TBD** — tabela honesta.

---

## Mapa de skills no ambiente emulado

Incluir em **Contribuição & Git Flow** ou **Manutenibilidade**:

| Comando lógico | Skill | Quando invocar |
|----------------|-------|----------------|
| `/MegaBrain` | orquestrar | Ciclo fechado completo |
| `/planejar` | planner | Decomposição, contratos, DAG |
| `/backend` | backend | Servidor, dados, integrações |
| `/frontend` | frontend | UI e cliente |
| `/testes` | testing | Validação e auto-correção |
| `/seguranca` | security | Auditoria de riscos |
| `/validar` | po-review | Gate de aceite antes da doc |
| `/documentar` | documentation | **Esta skill — Fase 6 final** |

**Persistência:** o fluxo **estabelece** registo em `.agent_history.md` para reidratação — a documentação **reflete** esse protocolo, não o inventa.

---

## Integração com `doc-coauthoring`

Se a skill ou fluxo **doc-coauthoring** existir no ambiente:

1. **Carregar** antes da redação final.
2. Alinhar tom, revisão por secções e convenções de equipa.
3. Em conflito com este `SKILL.md`, **prevalece** o contrato de Fase 6 (Master README + Final Gate + Mermaid obrigatório).

---

## Protocolo Anti-Alucinação

| Verificação | Método | Se falhar |
|-------------|--------|-----------|
| Endpoint/rota documentado | Grep / leitura de router | Remover ou marcar `TBD` |
| Comando Quick Start | Manifest / scripts npm/Makefile | Não publicar comando inventado |
| Versão/stack | Lockfiles, CI | Badge ou texto genérico sem versão falsa |
| Comportamento de API | Código ou OpenAPI | Não documentar status/body não evidenciados |
| Decisão arquitetural | Código + `.agent_history.md` | Narrar como hipótese `TBD` |

> **Regra de ouro:** a documentação **nunca** fecha a lacuna de implementação com ficção eloquente.

---

## O que esta skill NÃO faz

- **Não** implementa código de produto (`backend` / `frontend`).
- **Não** altera veredito PO nem reabre Fase 5.
- **Não** substitui relatório de segurança completo.
- **Não** promete SLAs, performance ou compliance não evidenciados.
- **Não** apaga ou reescreve `.agent_history.md`.
- **Não** entrega documentação antes do Final Gate quando o histórico existir.

---

## Checklist interno (antes de publicar)

- [ ] `.agent_history.md` lido e consolidado (ou ausência declarada).
- [ ] Fase 5 `OK` assumida ou utilizador pediu doc **fora** do orquestrador (explicitar limitação).
- [ ] Hero + badges honestos + TOC navegável.
- [ ] Quick Start ≤ 3 passos, comandos verificáveis.
- [ ] ≥ 1 `flowchart` de arquitetura + ≥ 1 `sequenceDiagram` ou `stateDiagram` quando aplicável.
- [ ] APIs com tabela + exemplo curl/código executável.
- [ ] Linguagem de autoridade — zero "eu" / "este ficheiro".
- [ ] Collapsibles para blocos densos (env, schemas longos).
- [ ] `TBD` explícito onde faltar evidência.
- [ ] Master README com todas as secções obrigatórias na ordem.
- [ ] `[ENTREGA DOCUMENTAÇÃO]` com paths e encerramento.

---

## Mapeamento Documentation → Orquestrador

| Saída desta skill | Uso no `orquestrar` |
|-------------------|---------------------|
| README / docs atualizados | Prova de Fase 6; utilizador pode commitar |
| Síntese do histórico | Fecho narrativo do ciclo |
| Lista `TBD` | Input para próximo `replanejar` ou spike |
| `[ENCERRAMENTO] concluído` | Orquestrador pode marcar **Status geral** `concluído` se resto vazio |

---

## Instrução final

A Fase 6 **não** é um apêndice — é o **cartão de visita** do sistema. Um README que só lista pastas **falha** o contrato. Um README com diagramas precisos, decisões explícitas, exemplos copiáveis e changelog honesto do `.agent_history.md` **prova** que o Orquestrador executou com excelência sénior.

**Quando o utilizador pedir documentação isolada (sem /MegaBrain):** aplicar o mesmo rigor de Master README e Mermaid; o Final Gate **ainda** consulta `.agent_history.md` se existir.

**O contrato com o leitor é a verdade verificável.** O Documentation **é** o guardião dessa clareza pública.

---
