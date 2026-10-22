#!/usr/bin/env python3
"""Print markdown table from raw/canonical-reconcile.json."""
from __future__ import annotations

import json
import sys
from pathlib import Path

EXP = Path(__file__).resolve().parents[1]
RECON = EXP / "raw" / "canonical-reconcile.json"


def main() -> int:
    if not RECON.is_file():
        print("missing canonical-reconcile.json", file=sys.stderr)
        return 1
    entries = json.loads(RECON.read_text(encoding="utf-8"))
    if not isinstance(entries, list):
        entries = [entries]
    print("| Label | Split | Arm | recall≥1 (canonical) | recall≥1 (at run) |")
    print("|-------|-------|-----|----------------------|-------------------|")
    for e in entries:
        label = e.get("label", "?")
        for key, val in sorted((e.get("summary") or {}).items()):
            split, arm = key.split(":", 1)
            print(
                f"| {label} | {split} | {arm} | {val.get('recall_ge1')} | {val.get('recall_at_run_ge1')} |"
            )
    return 0


if __name__ == "__main__":
    sys.exit(main())
