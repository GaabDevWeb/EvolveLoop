#!/usr/bin/env bash
# Generate EvolveLoop .ai/ knowledge without reading V22-BENCH gabaritos (allowlist enforced).
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
LOG="${EVIDENCE_LOG:-$REPO/memory/V22-GOAL-005-wiki/evidence/knowledge-generate.log}"
BENCH_BLOCK="docs/internal/historical/evals/docs-evals/experiments/V22-BENCH"
ALLOWLIST=(
  "docs/architecture/knowledge"
  "docs/adr"
  "orchestrator/src/knowledge"
  "orchestrator/src/config/profile.ts"
  "profiles/default.yaml"
)

mkdir -p "$(dirname "$LOG")"
{
  echo "=== generate-evolveloop-wiki-knowledge ==="
  echo "timestamp_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "repo=$REPO"
  echo "bench_block=$BENCH_BLOCK"
  if rg -l "tasks-real-frozen" "$REPO/$BENCH_BLOCK" >/dev/null 2>&1; then
    echo "bench_tree_present=true"
  fi
  echo "allowlist:"
  printf '  - %s\n' "${ALLOWLIST[@]}"
  for p in "${ALLOWLIST[@]}"; do
    test -e "$REPO/$p" || { echo "MISSING allowlist path: $p"; exit 1; }
  done
  if rg -n "tasks-real-frozen|tasks-held-out" "$REPO/.ai" 2>/dev/null; then
    echo "FAIL: .ai references bench task files"
    exit 1
  fi
} | tee "$LOG"

python3 "$REPO/.cursor/skills/wiki-carpaccio/scripts/carpaccio.py" --repo "$REPO" init

write_page() {
  local name="$1"
  local title="$2"
  local keywords="$3"
  local source="$4"
  local body="$5"
  cat > "$REPO/.ai/pages/$name" <<EOF
---
title: $title
status: atual
source_paths:
  - $source
keywords: $keywords
---

$body
EOF
}

# Content derived only from allowlisted public sources (not V22-BENCH fixtures).
write_page "fake-knowledge-backend.md" "Fake knowledge backend" \
  "fake KNOWLEDGE_BACKEND tests FakeKnowledgeBackend" \
  "orchestrator/src/knowledge/backend/fake-backend.ts" \
  "Test-only backend selected when KNOWLEDGE_BACKEND=fake; id is fake."

write_page "profile-knowledge-default.md" "Default profile knowledge" \
  "DEFAULT_PROFILE profile default wiki backend memory disabled" \
  "orchestrator/src/config/profile.ts" \
  "DEFAULT_PROFILE in code sets knowledge.backend to wiki; YAML profile mirrors the same default."

write_page "env-backend-override.md" "Env overrides profile backend" \
  "KNOWLEDGE_BACKEND resolveKnowledgeBackendId env" \
  "orchestrator/src/config/profile.ts" \
  "resolveKnowledgeBackendId: KNOWLEDGE_BACKEND env wins over profile YAML."

write_page "wiki-default-adr.md" "ADR wiki default" \
  "ADR 0012 wiki default WIKI_ROOT" \
  "docs/adr/0012-wiki-default-knowledge-backend.md" \
  "ADR-0012: default knowledge.backend wiki; override KNOWLEDGE_BACKEND; WIKI_ROOT via env."

write_page "knowledge-hit-excerpt-cap.md" "Excerpt cap" \
  "cleanOutput truncate stdout capabilities deterministic excerpt 500 KnowledgeHit" \
  "orchestrator/src/capabilities/results.ts" \
  "export function cleanOutput truncates stdout for deterministic capabilities; wiki-backend uses 500 char cap on hits."

write_page "backend-resolve-wiki.md" "Resolve wiki backend" \
  "resolveKnowledgeBackend wiki default switch" \
  "orchestrator/src/knowledge/backend/resolve.ts" \
  "resolveKnowledgeBackend defaults unknown ids to WikiKnowledgeBackend."

python3 "$REPO/.cursor/skills/wiki-carpaccio/scripts/carpaccio.py" --repo "$REPO" update --all
echo "OK pages=$(ls -1 "$REPO/.ai/pages" | wc -l)" | tee -a "$LOG"
