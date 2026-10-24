# Session log

## 2026-10-24 — V22-CAVEMAN-HG-1

- knowledge_grounding: applied, with gap. Vault fixture `fixtures/evolveloop-wiki-vault` has no Caveman page. Sources used: `docs/research/evolveloop-v2.2/03-repositories-and-tools.md`, `docs/research/evolveloop-v2.2/06-token-optimization.md`, upstream `skills/caveman/SKILL.md` at `d262ab3882952a59312ff3537cd86d894523c5ab`.
- Decision: vendor the v4.0.1 voice skill only. Output hard gate default ON. Opt-out `EVOLVELOOP_BREVITY_CAVEMAN=off`. `caveman-compress` stays out.
- Exceptions stay verbatim: code, commands, paths, evidence, SHAs, commit messages, user docs, task reports (structured fields), security content.
