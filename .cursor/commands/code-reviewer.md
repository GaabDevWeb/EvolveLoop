# /code-reviewer — Code Reviewer (review de implementação)

Invoca a skill **code-reviewer** (`.cursor/skills/code-reviewer/SKILL.md`) — specialization **Code Reviewer** / PDA `gate`|`critic`.

Alias: `/revisar-codigo`.

1. Ler `.cursor/skills/code-reviewer/SKILL.md` (boundaries + DO/DO NOT).
2. Revisar **diff/paths** — findings + veredito `LGTM` | `CHANGES_REQUESTED` | `BLOCKED`.
3. **Não** é aceite PO (`/validar` / po-review).
4. **Não** executar suite (`/testes` / testing).
5. **Não** checklist DoD formal (`/validator`).
6. **Não** implementar patches.

Args: diff, paths ou resumo de PR + brief se existir.
