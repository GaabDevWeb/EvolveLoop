#!/usr/bin/env python3
"""OFFICIAL_WIKI_GROUND manifest writer and validator."""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

EXP_DIR = Path(__file__).resolve().parents[1]
TASKS_FROZEN = EXP_DIR / "tasks-held-out-frozen.json"
HARNESS = Path(__file__).resolve().parent / "ground_b1_harness.py"
HARNESS_VERSION = "v22-ground-b1-harness-1.5.0"


def repo_root() -> Path:
    out = subprocess.check_output(
        ["git", "rev-parse", "--show-toplevel"], cwd=EXP_DIR, text=True
    )
    return Path(out.strip())


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def recall_ge1(summary: dict[str, Any], arm: str) -> tuple[int, int]:
    ag = summary.get("aggregates") or {}
    total = 0
    hits = 0
    for key, val in ag.items():
        if not key.endswith(f":{arm}"):
            continue
        total += 1
        if float(val.get("recall", 0)) >= 1.0:
            hits += 1
    return hits, total


def load_summary(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def aggregates_from_all_runs(all_runs: list[dict[str, Any]]) -> dict[str, dict[str, float]]:
    from collections import defaultdict

    buckets: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for rec in all_runs:
        m = rec.get("metrics") or {}
        buckets[f"{rec['task_id']}:{rec['arm']}"].append(m)

    def median(vals: list[float]) -> float:
        if not vals:
            return 0.0
        s = sorted(vals)
        n = len(s)
        mid = n // 2
        return float(s[mid]) if n % 2 else (s[mid - 1] + s[mid]) / 2.0

    out: dict[str, dict[str, float]] = {}
    for key, ms in buckets.items():
        out[key] = {
            "median_paths": median([len(x.get("paths_read") or []) for x in ms]),
            "median_input_tokens": median([float(x.get("input_tokens", 0)) for x in ms]),
            "median_latency_ms": median([float(x.get("latency_ms", 0)) for x in ms]),
            "recall": float(ms[0].get("recall", 0)),
        }
    return out


def validate_raw_matches_summary(run_dir: Path, split: str) -> list[str]:
    errors: list[str] = []
    base = run_dir / split
    summary_path = base / "held-out-summary.json"
    all_path = base / "held-out-all-runs.json"
    if not summary_path.is_file() or not all_path.is_file():
        return [f"missing summary or all-runs in {base}"]
    summary = load_summary(summary_path)
    all_runs = json.loads(all_path.read_text(encoding="utf-8"))
    recomputed = aggregates_from_all_runs(all_runs)
    for key, expected in (summary.get("aggregates") or {}).items():
        got = recomputed.get(key)
        if not got:
            errors.append(f"{base}: missing aggregate {key}")
            continue
        for field in ("recall", "median_paths", "median_input_tokens", "median_latency_ms"):
            if float(expected.get(field, -1)) != float(got.get(field, -2)):
                errors.append(
                    f"{base}: {key}.{field} summary={expected.get(field)} recomputed={got.get(field)}"
                )
    return errors


def validate_tasks_frozen(expected_hash: str | None) -> list[str]:
    errors: list[str] = []
    if not TASKS_FROZEN.is_file():
        return ["tasks-held-out-frozen.json missing"]
    actual = sha256_file(TASKS_FROZEN)
    if expected_hash and actual != expected_hash:
        errors.append(f"tasks frozen hash mismatch expected={expected_hash} actual={actual}")
    return errors


def validate_b1_no_task_rg_leak() -> list[str]:
    import re

    text = HARNESS.read_text(encoding="utf-8")
    errors: list[str] = []
    b1_chunk = text.split("def run_b1_ground", 1)[-1].split("def resolve_b1", 1)[0]
    if re.search(r"""task\[['"]rg_patterns['"]\]""", b1_chunk):
        errors.append("harness run_b1_ground uses task rg_patterns (leak)")
    return errors


def validate_manifest(manifest_path: Path) -> tuple[bool, list[str]]:
    errors: list[str] = []
    if not manifest_path.is_file():
        return False, ["manifest missing"]
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("status") != "SUCCESS":
        errors.append(f"manifest status={manifest.get('status')}")
        return False, errors

    tasks_hash = manifest.get("tasks_frozen_sha256")
    errors.extend(validate_tasks_frozen(tasks_hash))
    errors.extend(validate_b1_no_task_rg_leak())

    bench_root = Path(manifest["bench_root"])
    for run in manifest.get("runs") or []:
        run_dir = bench_root / run["id"]
        for split in ("dev", "test"):
            errors.extend(validate_raw_matches_summary(run_dir, split))

    return len(errors) == 0, errors


def cmd_write_success(args: argparse.Namespace) -> int:
    repo = repo_root()
    tree_sha = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=repo, text=True).strip()
    tasks_hash = sha256_file(TASKS_FROZEN)
    runs_meta: list[dict[str, Any]] = []
    for i in range(1, args.runs + 1):
        rid = f"run-{i:02d}"
        run_dir = Path(args.bench_root) / rid
        dev_s = load_summary(run_dir / "dev" / "held-out-summary.json")
        test_s = load_summary(run_dir / "test" / "held-out-summary.json")
        b0d, td = recall_ge1(dev_s, "B0")
        b1d, _ = recall_ge1(dev_s, "B1")
        b0t, tt = recall_ge1(test_s, "B0")
        b1t, _ = recall_ge1(test_s, "B1")
        runs_meta.append(
            {
                "id": rid,
                "dev": {
                    "B0_recall_ge1": f"{b0d}/{td}",
                    "B1_recall_ge1": f"{b1d}/{td}",
                    "rollups": dev_s.get("rollups"),
                },
                "test": {
                    "B0_recall_ge1": f"{b0t}/{tt}",
                    "B1_recall_ge1": f"{b1t}/{tt}",
                    "rollups": test_s.get("rollups"),
                },
            }
        )

    payload = {
        "schema": "v22-official-wiki-ground-manifest-v1",
        "status": "SUCCESS",
        "gate": "OFFICIAL_WIKI_GROUND",
        "retrieval_mode": "hybrid",
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "tree_sha": tree_sha,
        "harness_version": HARNESS_VERSION,
        "tasks_frozen_sha256": tasks_hash,
        "tasks_frozen_path": str(TASKS_FROZEN.relative_to(repo)),
        "karpathy_wiki_sha_label": "cd3cf08",
        "karpathywiki_tarball_sha256": args.tarball_sha256,
        "ollama_embedding_model": args.ollama_model,
        "bench_env": {
            "V22_BENCH_MAX_PATHS": 45,
            "V22_BENCH_MAX_INPUT_TOKENS": 22000,
            "V22_B1_RETRIEVAL": "hybrid",
            "V22_ANCHOR_RECALL": "file",
        },
        "commands": [
            "docs/architecture/v2.2/scripts/run-official-wiki-hybrid-bench.sh",
        ],
        "bench_root": str(Path(args.bench_root).resolve()),
        "runs": runs_meta,
    }
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return 0


def cmd_write_failure(args: argparse.Namespace) -> int:
    repo = repo_root()
    payload = {
        "schema": "v22-official-wiki-ground-manifest-v1",
        "status": "FAILED",
        "reason": args.reason,
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "tree_sha": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=repo, text=True).strip(),
        "pipeline_log": args.log,
    }
    Path(args.out).write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return 1


def main() -> int:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    ws = sub.add_parser("write-success")
    ws.add_argument("--out", required=True)
    ws.add_argument("--bench-root", required=True)
    ws.add_argument("--runs", type=int, required=True)
    ws.add_argument("--tarball-sha256", required=True)
    ws.add_argument("--ollama-model", required=True)
    ws.set_defaults(func=cmd_write_success)
    wf = sub.add_parser("write-failure")
    wf.add_argument("--out", required=True)
    wf.add_argument("--reason", required=True)
    wf.add_argument("--log", required=True)
    wf.set_defaults(func=cmd_write_failure)
    val = sub.add_parser("validate")
    val.add_argument("manifest")
    def _cmd_validate(a: argparse.Namespace) -> int:
        ok, errs = validate_manifest(Path(a.manifest))
        if not ok:
            for e in errs:
                print(f"FAIL: {e}", file=sys.stderr)
            return 2
        print("OK manifest")
        return 0

    val.set_defaults(func=_cmd_validate)
    args = ap.parse_args()
    if args.cmd == "validate":
        ok, errs = validate_manifest(Path(args.manifest))
        if not ok:
            for e in errs:
                print(f"FAIL: {e}", file=sys.stderr)
            return 2
        print("OK manifest")
        return 0
    return int(args.func(args))


if __name__ == "__main__":
    sys.exit(main())
