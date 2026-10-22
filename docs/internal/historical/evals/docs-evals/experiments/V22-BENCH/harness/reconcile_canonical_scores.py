#!/usr/bin/env python3
"""Rescore frozen run JSON paths with canonical scorer; compare arms/splits."""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))

from v22_anchor_scorer import SCORER_VERSION, effective_scorer_mode, rescore_run_metrics

EXP = Path(__file__).resolve().parents[1]
TASKS = EXP / "tasks-held-out-frozen.json"


def repo_root() -> Path:
    out = subprocess.check_output(["git", "rev-parse", "--show-toplevel"], cwd=EXP, text=True)
    return Path(out.strip())


def load_tasks() -> dict[str, dict[str, Any]]:
    spec = json.loads(TASKS.read_text(encoding="utf-8"))
    return {t["id"]: t for t in spec["tasks"]}


def recall_ge1(rows: list[dict[str, Any]]) -> tuple[int, int]:
    hits = sum(1 for r in rows if r["canonical_recall"] >= 1.0)
    return hits, len(rows)


def rescore_run_file(path: Path, repo: Path, task_map: dict[str, dict]) -> dict[str, Any]:
    rec = json.loads(path.read_text(encoding="utf-8"))
    tid = rec["task_id"]
    arm = rec["arm"]
    m = rec.get("metrics") or {}
    paths = list(m.get("paths_read") or [])
    task = task_map[tid]
    scored = rescore_run_metrics(repo, paths, task["anchors"])
    return {
        "task_id": tid,
        "arm": arm,
        "source": str(path.relative_to(EXP)),
        "tokenizer_at_run": rec.get("tokenizer"),
        "paths": len(paths),
        "tokens_at_run": m.get("input_tokens"),
        "recall_at_run": float(m.get("recall", 0)),
        "canonical_recall": scored["recall"],
        "canonical_notes": scored["recall_notes"],
        "scorer": scored["scorer_version"],
        "scorer_mode": scored["scorer_mode"],
    }


def collect_runs(root: Path, pattern: str = "run-01.json") -> list[Path]:
    seen: set[Path] = set()
    out: list[Path] = []
    for p in sorted(root.glob(f"**/{pattern}")):
        if p.parent.name not in ("B0", "B1", "B3"):
            continue
        rp = p.resolve()
        if rp in seen:
            continue
        seen.add(rp)
        out.append(p)
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--label", required=True)
    ap.add_argument("--raw-root", type=Path, required=True, help="e.g. run-01/dev or battery-b3-graphify")
    ap.add_argument("--split-dev", default="H07-H18")
    ap.add_argument("--split-test", default="H19-H24")
    ap.add_argument("-o", type=Path, default=EXP / "raw" / "canonical-reconcile.json")
    args = ap.parse_args()

    os.environ.setdefault("V22_ANCHOR_SCORER_MODE", "file_evidence")
    repo = repo_root()
    task_map = load_tasks()
    root = args.raw_root if args.raw_root.is_absolute() else EXP / "raw" / args.raw_root
    files = collect_runs(root)
    rows = [rescore_run_file(p, repo, task_map) for p in files if p.parent.name in ("B0", "B1", "B3")]

    def in_split(tid: str, spec: str) -> bool:
        if "-" not in spec or not spec.startswith("H"):
            return True
        a, b = spec.split("-", 1)
        lo, hi = int(a[1:]), int(b[1:])
        n = int(tid[1:])
        return lo <= n <= hi

    out = {
        "label": args.label,
        "raw_root": str(root),
        "tree_sha": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=repo, text=True).strip(),
        "canonical_scorer": SCORER_VERSION,
        "canonical_mode": effective_scorer_mode(),
        "rows": rows,
        "summary": {},
    }
    for split_name, spec in (("dev", args.split_dev), ("test", args.split_test)):
        for arm in ("B0", "B1", "B3"):
            subset = [r for r in rows if r["arm"] == arm and in_split(r["task_id"], spec)]
            if not subset:
                continue
            h, t = recall_ge1(subset)
            out["summary"][f"{split_name}:{arm}"] = {
                "recall_ge1": f"{h}/{t}",
                "recall_at_run_ge1": f"{sum(1 for r in subset if r['recall_at_run']>=1)}/{t}",
            }

    args.o.parent.mkdir(parents=True, exist_ok=True)
    existing: list[Any] = []
    if args.o.is_file():
        existing = json.loads(args.o.read_text(encoding="utf-8"))
        if not isinstance(existing, list):
            existing = [existing]
    existing.append(out)
    args.o.write_text(json.dumps(existing, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(out["summary"], indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
