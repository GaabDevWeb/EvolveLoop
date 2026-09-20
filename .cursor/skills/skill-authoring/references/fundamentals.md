# Fundamentos de Agent Skills

Resumo dos princípios da built-in `create-skill`. Leia ao **escrever o draft** (Fase 2) ou quando o utilizador perguntar sobre estrutura de `SKILL.md`.

## Estrutura de diretório

```
skill-name/
├── SKILL.md              # Obrigatório
├── references/           # Docs carregados sob demanda
├── examples/             # Exemplos de uso
├── templates/            # Templates reutilizáveis
└── scripts/              # Scripts executáveis (não só referência)
```

## Onde guardar

| Tipo | Path | Âmbito |
|------|------|--------|
| Pessoal | `~/.cursor/skills/` ou `~/.agents/skills/` | Todos os projetos |
| Projeto | `.cursor/skills/` | Repositório partilhado |

**Nunca** criar em `~/.cursor/skills-cursor/` (reservado ao Cursor).

## Frontmatter obrigatório

```yaml
---
name: skill-name          # max 64 chars, lowercase, hífens
description: >            # max 1024 chars, terceira pessoa, WHAT + WHEN
  O que faz. Use quando o utilizador mencionar X, Y, Z.
disable-model-invocation: true   # omitir só se auto-invocação desejada
---
```

A `description` é o **mecanismo principal de triggering** — toda informação "quando usar" vai aqui, não no corpo.

## Progressive disclosure

1. **Metadata** (name + description) — sempre no contexto (~100 palavras)
2. **SKILL.md** — quando a skill dispara (<500 linhas ideal)
3. **Bundled resources** — sob demanda (ilimitado; scripts executam sem carregar)

Se `SKILL.md` aproxima 500 linhas, mover detalhe para `references/` com links claros de *quando ler*.

## Descriptions eficazes

- Terceira pessoa: "Processa PDFs" (não "Posso ajudar com PDFs")
- Específica com termos de trigger
- Incluir WHAT e WHEN
- Para skills que sub-triggeram pouco: description ligeiramente "assertiva" (cobrir sinónimos e contextos implícitos)

## Padrões de conteúdo

| Padrão | Quando usar |
|--------|-------------|
| Template | Output com formato fixo |
| Examples | Qualidade depende de ver exemplos |
| Workflow | Operações multi-passo com checklist |
| Conditional | Ramificações por tipo de tarefa |
| Feedback loop | Validação antes de prosseguir |

## Graus de liberdade

| Nível | Uso |
|-------|-----|
| Alto (texto) | Múltiplas abordagens válidas |
| Médio (templates) | Padrão preferido com variação aceitável |
| Baixo (scripts) | Operações frágeis, consistência crítica |

## Anti-patterns

- Paths Windows (`scripts\helper.py`)
- Muitas opções sem default
- Informação sensível ao tempo sem secção "legacy"
- Terminologia inconsistente (misturar "endpoint", "route", "path")
- Nomes vagos: `helper`, `utils`, `tools`
- Texto verbatim do utilizador: respeitar palavras exactas quando pedido

## Segurança

Skills não devem surpreender o utilizador face ao propósito declarado. Sem malware, exploits ou conteúdo que facilite acesso não autorizado.

## Checklist rápido (draft)

- [ ] `name` válido, `description` com triggers
- [ ] SKILL.md < 500 linhas
- [ ] Referências a um nível de profundidade
- [ ] Terminologia consistente
- [ ] Exemplos concretos, não abstractos
