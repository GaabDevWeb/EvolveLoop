#!/usr/bin/env bash
# Canonical EvolveLoop test accounting — unambiguous V1 / V2 / validator counts.
# Usage: bash scripts/test-accounting.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

V1_GLOBS=(
  tests/evals/evolveloop-v1-adversarial-audit.test.ts
  tests/evals/evolveloop-final-evals.test.ts
  tests/evals/evolveloop-longitudinal-evals.test.ts
  tests/evals/evolveloop-live-evals.test.ts
  tests/evals/identity-flow-matrix.test.ts
  tests/unit/evolveloop
)

V2_UNIT=(
  tests/unit/requirements-se01.test.ts
  tests/unit/architecture-se02.test.ts
  tests/unit/task-graph-se03.test.ts
  tests/unit/supervisor-se04.test.ts
  tests/unit/engineering-worker-se05.test.ts
  tests/unit/engineering-review-se06.test.ts
  tests/unit/se07-e2e-benchmark.test.ts
  tests/unit/cursor-reasoning-se08.test.ts
  tests/unit/reasoning-provider-adapter.test.ts
  tests/unit/backends
  tests/unit/benchmarks-aj.test.ts
  tests/unit/authority.test.ts
  tests/unit/skill-gates.test.ts
  tests/unit/deterministic-capabilities.test.ts
)

V2_INTEGRATION=(
  tests/integration/a02-skill-execution.test.ts
  tests/integration/a03-runtime-gates.test.ts
  tests/integration/a04-bounded-replan.test.ts
  tests/integration/b01-resource-policy.test.ts
  tests/integration/b04-checkpoint-recovery.test.ts
  tests/integration/v2-intent-execution.test.ts
  tests/integration/agent-executor.test.ts
)

VALIDATOR=(
  tests/evals/redteam-adversarial-campaign.test.ts
  tests/evals/post-prune-mass-scenarios.test.ts
  tests/evals/engine-scenarios.test.ts
)

run_count() {
  local label="$1"; shift
  local out
  out="$(npx vitest run "$@" --reporter=json 2>/dev/null | tail -1 || true)"
  # Fallback: dot reporter parse
  local summary
  summary="$(npx vitest run "$@" --reporter=dot 2>&1 | tail -20)"
  echo "=== $label ==="
  echo "$summary" | rg "Test Files|Tests " || echo "$summary" | tail -5
}

echo "EvolveLoop canonical test accounting"
echo "cwd=$ROOT"
run_count "V1" "${V1_GLOBS[@]}"
run_count "V2_UNIT" "${V2_UNIT[@]}"
run_count "V2_INTEGRATION" "${V2_INTEGRATION[@]}"
run_count "VALIDATOR" "${VALIDATOR[@]}"
run_count "FULL" 
