#!/usr/bin/env bash
# Cursor afterShellExecution hook — invoca pickup após run-engine escrever SkillJobs.
set -euo pipefail

input="$(cat)"
command="$(node -e "const i=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(i.command||'')" <<< "$input")"

if [[ ! "$command" =~ run-engine ]] || [[ ! "$command" =~ jobs-dir ]]; then
  echo '{}'
  exit 0
fi

HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_resolve-root.sh
source "$HOOK_DIR/_resolve-root.sh"

PROJECT_ROOT="$(resolve_project_root || true)"
if [[ -z "$PROJECT_ROOT" ]]; then
  echo '{}'
  exit 0
fi

ORCH="$PROJECT_ROOT/orchestrator"
CURSOR_META="$PROJECT_ROOT/.cursor"
JOBS_DIR="${ORCHESTRATOR_JOBS_DIR:-$ORCH/jobs}"
PROMPT_DIR="${ORCHESTRATOR_PROMPT_DIR:-$CURSOR_META/pickup}"
RUN_JOBS="$ORCH/dist/cli/run-jobs.js"

RESULT="$(node "$RUN_JOBS" invoke --jobs-dir "$JOBS_DIR" --prompt-dir "$PROMPT_DIR" 2>/dev/null || echo '{"status":"idle"}')"

node -e "
const plan = JSON.parse(process.argv[1]);
if (plan.status !== 'ready') {
  console.log('{}');
  process.exit(0);
}
console.log(JSON.stringify({
  additional_context: 'SkillJob pending after run-engine. Pickup prompt: ' + plan.prompt_path + ' (run_id: ' + plan.run_id + '). Execute skill then run-jobs complete.'
}));
" "$RESULT"
