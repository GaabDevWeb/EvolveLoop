#!/usr/bin/env bash
# Validates V2.2 goals documentation pack (paths, 14 fields per goal, matrix coverage, numeric gates).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="$(cd "$ROOT/../../.." && pwd)"
GOALS="$ROOT/EVOLVELOOP_V2.2_GOALS.md"
MATRIX="$ROOT/TRACEABILITY-MATRIX.md"
FAIL=0

log() { printf '%s\n' "$*"; }
fail() { log "FAIL: $*"; FAIL=1; }
pass() { log "PASS: $*"; }

REQUIRED_GOALS=(
  V22-GOAL-001 V22-GOAL-002 V22-GOAL-003 V22-GOAL-004
  V22-GOAL-005 V22-GOAL-006 V22-GOAL-007
  V22-GOAL-008 V22-GOAL-009 V22-GOAL-010
)

FIELDS=(
  "ID"
  "Prioridade"
  "Título"
  "Problema"
  "Estado atual"
  "Resultado"
  "Solução"
  "Dependências"
  "Impacto arquitetural"
  "Critérios de aceite"
  "Métricas"
  "Validação / testes"
  "Riscos"
  "Condição de conclusão"
)

log "=== V2.2 artifacts validator ==="
log "repo=$REPO"
log "pack=$ROOT"

for f in \
  "$GOALS" \
  "$MATRIX" \
  "$ROOT/TECH-DECISIONS-MATRIX.md" \
  "$ROOT/BENCHMARK-PLAN.md" \
  "$ROOT/IMPLEMENTATION-ROADMAP.md" \
  "$ROOT/CONSOLIDATION-REPORT.md" \
  "$REPO/docs/research/evolveloop-v2.2/README.md" \
  "$REPO/docs/research/evolveloop-v2.2/09-v2.2-proposed-scope.md" \
  "$REPO/docs/research/evolveloop-v2.2/08-benchmarks-and-test-plan.md"
do
  if [[ -f "$f" ]]; then pass "required file exists: ${f#"$REPO"/}"; else fail "missing required file: ${f#"$REPO"/}"; fi
done

# Path references: backtick paths under repo (docs/, orchestrator/, profiles/, .cursor/)
while IFS= read -r line; do
  path="${line##*:}"
  path="${path#\`}"
  path="${path%\`}"
  [[ "$path" == *'*'* ]] && continue
  [[ "$path" == evolve-v3:* ]] && continue
  full="$REPO/$path"
  if [[ -e "$full" ]]; then
    pass "cited path exists: $path"
  else
    fail "cited path missing: $path (from goals pack)"
  fi
done < <(grep -oE '`(docs/[^`]+|orchestrator/[^`]+|profiles/[^`]+|\.cursor/[^`]+|mcp/[^`]+)`' "$GOALS" "$MATRIX" "$ROOT/TECH-DECISIONS-MATRIX.md" "$ROOT/BENCHMARK-PLAN.md" "$ROOT/CONSOLIDATION-REPORT.md" 2>/dev/null | sed 's/^[^:]*://' | sort -u)

for gid in "${REQUIRED_GOALS[@]}"; do
  if ! grep -q "$gid" "$GOALS"; then fail "goal $gid missing from GOALS"; else pass "goal $gid present in GOALS"; fi
  if ! grep -q "$gid" "$MATRIX"; then fail "goal $gid missing from TRACEABILITY-MATRIX"; else pass "goal $gid present in TRACEABILITY-MATRIX"; fi
  block="$(awk -v g="$gid" '
    $0 == "## " g { flag=1; next }
    /^## V22-GOAL-/ { if (flag) exit }
    flag
  ' "$GOALS")"
  if [[ -z "$block" ]]; then fail "no section for $gid"; continue; fi
  for field in "${FIELDS[@]}"; do
    if echo "$block" | grep -qF -- "- **${field}:**"; then
      pass "$gid field: $field"
    else
      fail "$gid missing field: $field"
    fi
  done
done

# Numeric targets: in GOALS metrics lines, require PENDING_BASELINE or N/A or explicit non-target wording
while IFS= read -r gid; do
  metrics_line="$(awk -v g="$gid" '
    $0 == "## " g { flag=1; next }
    /^## V22-GOAL-/ { if (flag) exit }
    flag
  ' "$GOALS" | grep -E '^- \*\*Métricas\*\*:' || true)"
  if [[ -z "$metrics_line" ]]; then continue; fi
  if echo "$metrics_line" | grep -qE 'PENDING_BASELINE|N/A|não numérico|sem alvo numérico|NOT_MEASURED'; then
    pass "$gid metrics gated (PENDING_BASELINE/N/A/NOT_MEASURED)"
  elif echo "$metrics_line" | grep -qE '[0-9]+%|−[0-9]|[0-9]+×'; then
    fail "$gid metrics contains numeric target without PENDING_BASELINE: $metrics_line"
  else
    pass "$gid metrics: no forbidden percent gate detected"
  fi
done < <(printf '%s\n' "${REQUIRED_GOALS[@]}")

if [[ "$FAIL" -eq 0 ]]; then
  log "=== VERDICT: PASS ==="
  exit 0
fi
log "=== VERDICT: FAIL ==="
exit 1
