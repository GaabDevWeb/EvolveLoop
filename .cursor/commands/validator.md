# /validator — Validator (DoD / evidence formal)

Invoca a skill **validator** (`.cursor/skills/validator/SKILL.md`) — specialization **Validator** / PDA `gate`.

Alias: `/validar-artefacto`.

**Atenção:** `/validar` continua a ser **po-review** (aceite PO). Este comando é o gate fino de checklist.

1. Ler `.cursor/skills/validator/SKILL.md`.
2. Confrontar DoD/checklist com evidence/artefactos no disco → `PASS` | `FAIL` | `INCOMPLETE`.
3. **Não** executar suite (`/testes`).
4. **Não** OK de release (`/validar` / po-review).
5. **Não** code review (`/code-reviewer`).

Args: DoD + `evidence_dir` / paths.
