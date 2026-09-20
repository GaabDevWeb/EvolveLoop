# Template do Dossiê — 38 Secções

Texto normativo. O output final deve cobrir **todas** as secções abaixo sobre `[LIB_NAME]`.

---

# MISSÃO

Você é um agente de pesquisa técnica sênior especializado em engenharia de software.

Sua única missão é produzir um **dossiê técnico extremamente completo** sobre a biblioteca/framework:

> **[LIB_NAME]**

O objetivo NÃO é gerar um tutorial simples.

O objetivo é produzir uma documentação de nível profissional que permita que qualquer desenvolvedor domine a biblioteca antes mesmo de começar a utilizá-la.

---

# FERRAMENTAS OBRIGATÓRIAS

Você DEVE utilizar obrigatoriamente:

* `/agent-browser`
* MCP Puppeteer

Não utilize apenas buscas superficiais.

Navegue profundamente pela documentação oficial, exemplos, repositórios, changelogs, artigos técnicos, discussões e referências relevantes.

---

# PRIORIDADE DAS FONTES

Siga esta ordem de prioridade:

1. Documentação oficial
2. Repositório oficial (GitHub)
3. Exemplos oficiais
4. Blog oficial
5. RFCs (quando existirem)
6. Release Notes
7. Changelog
8. Issues importantes do GitHub
9. Discussions oficiais
10. Artigos técnicos de alta qualidade
11. Vídeos oficiais
12. Benchmarks
13. Estudos comparativos

Nunca utilize uma fonte secundária quando existir documentação oficial para o mesmo assunto.

Sempre informe todas as referências utilizadas.

---

# PROFUNDIDADE DA PESQUISA

A pesquisa deve ser extremamente profunda.

Não assuma nada.

Não pule tópicos.

Sempre procure documentação adicional caso algum assunto pareça incompleto.

Continue pesquisando até que todos os tópicos tenham sido cobertos.

---

# ESCOPO DA PESQUISA

O documento deve conter obrigatoriamente:

---

## 1. Visão Geral

* O que é
* Qual problema resolve
* História
* Origem
* Criadores
* Filosofia
* Casos de uso
* Público-alvo
* Ecossistema

---

## 2. Arquitetura

Explicar profundamente:

* arquitetura interna
* funcionamento
* fluxo interno
* ciclo de vida
* pipeline
* abstrações
* componentes
* renderização
* comunicação interna

Sempre utilizar diagramas em Mermaid quando fizer sentido.

---

## 3. Como funciona internamente

Explique:

* o que acontece "por baixo dos panos"
* fluxo completo
* gerenciamento de estado
* gerenciamento de memória
* ciclo de execução
* eventos
* renderização
* atualização
* sincronização

---

## 4. Instalação

Cobrir:

npm

pnpm

yarn

bun

CDN (se existir)

Monorepo

Workspace

---

## 5. Configuração

Cobrir todas as configurações disponíveis.

Incluindo:

* arquivos
* opções
* flags
* presets
* plugins
* providers
* adapters
* aliases
* environments

Explicar cada configuração.

---

## 6. Estrutura recomendada de projeto

Mostrar:

estrutura de pastas

boas práticas

organização

escalabilidade

modularização

---

## 7. API completa

Documentar:

* funções
* classes
* hooks
* métodos
* componentes
* interfaces
* tipos
* utilidades
* helpers

Explicar:

* parâmetros
* retorno
* comportamento
* exemplos

---

## 8. Conceitos fundamentais

Explicar profundamente TODOS os conceitos importantes da biblioteca.

Não resumir.

---

## 9. Fluxo de desenvolvimento

Mostrar como um projeto normalmente evolui utilizando esta biblioteca.

---

## 10. Recursos avançados

Pesquisar todos.

Mesmo os menos conhecidos.

---

## 11. Performance

Explicar:

* otimizações
* gargalos
* custos
* memória
* CPU
* GPU
* renderização
* benchmark

---

## 12. Escalabilidade

Como grandes projetos utilizam esta biblioteca.

---

## 13. Integrações

Pesquisar integrações com:

React

Next

Vue

Angular

Node

Vite

Webpack

Tailwind

TypeScript

Three.js

GSAP

Framer Motion

e quaisquer integrações relevantes.

---

## 14. TypeScript

Pesquisar toda a integração.

Tipos.

Interfaces.

Generics.

Inferência.

Boas práticas.

---

## 15. Customização

Pesquisar tudo que pode ser customizado.

---

## 16. Plugins

Listar:

* plugins oficiais
* plugins populares
* plugins recomendados

Explicar quando utilizar cada um.

---

## 17. Ecossistema

Pesquisar:

* ferramentas
* extensões
* utilidades
* bibliotecas complementares

---

## 18. Casos reais

Pesquisar empresas que utilizam.

Projetos famosos.

Aplicações.

---

## 19. Exemplos completos

Criar exemplos progressivos:

Hello World

Básico

Intermediário

Avançado

Arquitetura profissional

---

## 20. Erros comuns

Pesquisar:

issues

StackOverflow

GitHub

Discussions

Reddit

Documentação

Listar:

erros frequentes

causas

soluções

---

## 21. Limitações

Pesquisar todas.

Quando NÃO utilizar.

---

## 22. Comparação

Comparar com alternativas.

Tabela completa.

Prós.

Contras.

Quando escolher cada uma.

---

## 23. Roadmap

Pesquisar roadmap oficial.

Features futuras.

RFCs.

Mudanças planejadas.

---

## 24. Breaking Changes

Pesquisar todas as mudanças importantes entre versões.

---

## 25. Changelog resumido

Explicar evolução da biblioteca.

---

## 26. Melhores práticas

Listar todas.

---

## 27. Anti-patterns

Pesquisar práticas incorretas.

Explicar por que devem ser evitadas.

---

## 28. Segurança

Pesquisar:

boas práticas

vulnerabilidades

riscos

mitigações

---

## 29. SEO (quando aplicável)

---

## 30. Acessibilidade (quando aplicável)

---

## 31. Testes

Pesquisar:

Jest

Vitest

Playwright

Cypress

Testing Library

Estratégias de testes.

---

## 32. Debug

Como debugar.

Ferramentas.

DevTools.

Logs.

Inspeção.

---

## 33. DevTools

Pesquisar ferramentas oficiais.

---

## 34. FAQ

Construir uma FAQ completa baseada na documentação e nas dúvidas recorrentes da comunidade.

---

## 35. Glossário

Explicar todos os termos técnicos relacionados à biblioteca.

---

## 36. Cheatsheet

Criar um resumo rápido contendo:

comandos

APIs

hooks

configurações

atalhos

---

## 37. Guia de aprendizado

Montar uma ordem recomendada para aprender a biblioteca.

Do básico ao avançado.

---

## 38. Referências

Listar todas as fontes utilizadas.

Separar:

Documentação

GitHub

Artigos

Vídeos

RFCs

Issues

Discussions

Benchmarks

---

# QUALIDADE ESPERADA

O documento deve possuir nível equivalente à documentação técnica utilizada por equipes de engenharia de grandes empresas.

Sempre que possível:

* utilizar tabelas
* utilizar diagramas Mermaid
* utilizar fluxogramas
* utilizar exemplos completos
* utilizar comparações
* utilizar imagens capturadas via MCP Puppeteer quando agregarem valor
* citar explicitamente a origem de cada informação relevante

Nenhuma seção deve ficar superficial.

Caso algum tópico possua documentação insuficiente, continue pesquisando em fontes confiáveis até esgotar o conhecimento disponível.

O resultado final deve ser um **dossiê técnico completo**, organizado, revisado e pronto para servir como material de referência permanente sobre **[LIB_NAME]**.
