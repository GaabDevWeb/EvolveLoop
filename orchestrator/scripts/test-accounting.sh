#!/usr/bin/env bash
# Canonical EvolveLoop test accounting — unambiguous buckets.
# Usage: bash scripts/test-accounting.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

count_pack() {
  local label="$1"; shift
  local out
  out="$(npx vitest run "$@" --reporter=dot 2>&1)" || true
  local line
  line="$(echo "$out" | rg -n "Tests " | tail -1 || true)"
  local files
  files="$(echo "$out" | rg -n "Test Files" | tail -1 || true)"
  echo "=== $label ==="
  echo "$files"
  echo "$line"
  # Extract passed/total if present
  if echo "$line" | rg -q "([0-9]+) passed"; then
    local passed failed skipped
    passed="$(echo "$line" | sed -n 's/.*\([0-9][0-9]*\) passed.*/\1/p' | head -1)"
    failed="$(echo "$line" | sed -n 's/.*\([0-9][0-9]*\) failed.*/\1/p' | head -1 || true)"
    skipped="$(echo "$line" | sed -n 's/.*\([0-9][0-9]*\) skipped.*/\1/p' | head -1 || true)"
    echo "PARSED passed=${passed:-0} failed=${failed:-0} skipped=${skipped:-0}"
  fi
  echo
}

V1=(
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
  tests/integration/job-resume.test.ts
)

VALIDATOR=(
  tests/evals/redteam-adversarial-campaign.test.ts
  tests/evals/post-prune-mass-scenarios.test.ts
  tests/evals/engine-scenarios.test.ts
  tests/evals/grounding-attestation-remediation.test.ts
  tests/evals/autonomous-loader-security.test.ts
  tests/evals/v2-final-integrity-campaign.test.ts
)

SKILL_CERT=(
  tests/evals/skill-certification-campaign.test.ts
)

echo "EvolveLoop canonical test accounting"
echo "cwd=$ROOT"
echo "date=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
count_pack "V1_CANONICAL" "${V1[@]}"
count_pack "V2_UNIT" "${V2_UNIT[@]}"
count_pack "V2_INTEGRATION" "${V2_INTEGRATION[@]}"
count_pack "VALIDATOR_REDTEAM_INTEGRITY" "${VALIDATOR[@]}"
count_pack "SKILL_CERTIFICATION" "${SKILL_CERT[@]}"
count_pack "FULL_ORCHESTRATOR"
