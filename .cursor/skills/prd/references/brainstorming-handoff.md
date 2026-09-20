# Handoff — brainstorming → prd

Quando o utilizador concluiu `~/.agents/skills/brainstorming/` e invoca `/prd`:

## Inputs esperados do brainstorming

- Design aprovado (sem código ainda)
- Decisões de produto documentadas na conversa
- Restrições explícitas
- Mockups ou wireframes (referenciar paths ou descrever — **não** implementar)

## Acção do PRD

1. **Extrair** requisitos da conversa de brainstorming — não reinventar
2. **Registar** na secção Contexto do PRD: "Origem: sessão brainstorming [data]"
3. **Formalizar** decisões informais em RF/RNF numerados
4. **Draft** ADR(s) *proposed* só quando forem product-driven no pacote; decisões irreversíveis / stack → handoff `/adr` (ou Architect) — prd **não** é autoridade final de arquitectura
5. **Traduzir** fluxos discutidos em ARCHITECTURE + API_SPEC + DATA-MODEL (visão de produto; gaps técnicos → `/adr`)

## O que NÃO fazer

- Repetir diálogo exploratório — assumir design fechado
- Pedir re-brainstorming salvo lacuna crítica (máx. 3 perguntas objectivas)
- Escrever código "para ilustrar"
- Fechar decisões arquitecturais sozinho (handoff `/adr` / Architect)

## Imagem anexada

Se brainstorming incluiu mockup: referenciar em PRD e ARCHITECTURE; **HARD-GATE** image-to-code aplica-se na fase frontend, não aqui.
