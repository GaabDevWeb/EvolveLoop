# Checklist — Pacote documental PRD

Verificar **antes** de declarar `[PACOTE DOCS — AGUARDA APROVAÇÃO]`.

## PRD (`docs/prd/YYYY-MM-DD-<feature>.md`)

- [ ] Metadados: data, autor, status, versão
- [ ] Contexto e problema
- [ ] Objectivos e métricas de sucesso
- [ ] Personas / utilizadores
- [ ] Requisitos funcionais (RF-NNN)
- [ ] Requisitos não-funcionais (RNF-NNN)
- [ ] Critérios de aceite por RF
- [ ] Fora de escopo explícito
- [ ] Dependências e riscos
- [ ] Glossário (se termos ambíguos)

## ADR (`docs/adr/NNNN-<titulo>.md`)

- [ ] Número sequencial correcto
- [ ] Status (proposed | accepted | deprecated)
- [ ] Contexto
- [ ] Decisão
- [ ] Alternativas consideradas (≥2)
- [ ] Consequências (positivas e negativas)

## API_SPEC (`docs/API_SPEC.md`)

- [ ] Base URL / versão
- [ ] Autenticação
- [ ] Endpoints (método, path, descrição)
- [ ] Request/response schemas
- [ ] Códigos de erro padronizados
- [ ] Rate limits / paginação (se aplicável)

## ARCHITECTURE (`docs/ARCHITECTURE.md`)

- [ ] Visão geral (diagrama ou descrição)
- [ ] Camadas / módulos
- [ ] Fluxos principais (happy path)
- [ ] Integrações externas
- [ ] Decisões de deploy/runtime

## DATA-MODEL (`docs/DATA-MODEL.md`)

- [ ] Entidades com atributos e tipos
- [ ] Relações (1:N, N:M)
- [ ] Índices propostos
- [ ] Regras de integridade
- [ ] Migrações previstas (nota)

## CONTRIBUTING (`docs/CONTRIBUTING.md`)

- [ ] Style guide (lint/format)
- [ ] Branch naming
- [ ] Commit message convention
- [ ] PR checklist
- [ ] Comandos locais (dev, test, lint)

## Cross-check global

- [ ] Nomes de entidades consistentes PRD ↔ DATA-MODEL ↔ API_SPEC
- [ ] Cada RF crítico traceável a endpoint ou fluxo
- [ ] ADRs referenciados em ARCHITECTURE
- [ ] Sem contradições entre documentos
