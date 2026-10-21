# Changelog

## Unreleased — public structure extraction

### CEO controller + engine fixes

- **Discovery CLI:** map capability IDs to bundled provider `metadata.name` so `--discovery` + `--jobs-dir` emit `JOB_PENDING` for `backend-implementation` / `frontend-ui` (not mock `simulated_evidence` for name mismatch).
- **run-engine:** load defaults from `~/.cursor/agents.env` / `ORCHESTRATOR_*` when CLI flags omitted.
- **Pickup paths:** `job-pickup` / `run-jobs pickup` usam `resolveOrchestratorRoot()` (`ORCHESTRATOR_ROOT` ou `process.cwd()`) em vez de `Cursor/orchestrator` hardcoded.
- **run-jobs reopen:** reset completed/failed SkillJob após `LINEAGE_MISMATCH`; **exit 2** + `REOPEN_NOT_ALLOWED` se o job já está `pending`.
- **Tests:** ritual E2 (`ceo-real` / `ceo-real2`), unit `job-resume-lineage`, `job-reopen` pending guard.
- **Hook:** `orchestrator-job-pickup.sh` follow-up body = `current-job.md` from `invoke`.
- **Docs:** `docs/CEO-controller.md` (fluxo completo, env, checkpoint removido no sucesso, reopen, Cloud vs desktop, `api-contract`); `gate-bundle.md` vault → `$WIKI_ROOT`.

- Public identity: **EvolveLoop** with entrypoint `/evolve`
- Profile boundary: `profiles/default.yaml` (memory opt-in); personal overlay on branch `GaabType`
- Wiki as default KnowledgeBackend; corpus via `WIKI_ROOT`
- AGENT.md, LICENSE (MIT), SECURITY, CONTRIBUTING, CODE_OF_CONDUCT
- MegaBrain retained as legacy alias on GaabType only
- Regression and public publish: **pending**
