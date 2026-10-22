#!/usr/bin/env python3
"""V22-BENCH — B3 arm: Graphify CLI code-graph retrieval (GOAL-008)."""
from __future__ import annotations

import hashlib
import json
import os
import platform
import re
import shutil
import subprocess
import sys
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

# Reuse budget + recall from held-out harness 1.5.0
from ground_b1_harness import (  # type: ignore[import-not-found]
    HARNESS_VERSION as GROUND_HARNESS_VERSION,
    anchor_recall,
    anchor_recall_mode,
    bench_max_input_tokens,
    bench_max_paths,
    git_sha,
    load_tokenizer,
    median,
    read_rel,
    repo_root,
    run_b0,
    run_b1_ground,
    resolve_b1_class_and_env,
)

EXP_DIR = Path(__file__).resolve().parents[1]
TASKS_REAL = EXP_DIR / "tasks-real-frozen.json"
TASKS_HELD = EXP_DIR / "tasks-held-out-frozen.json"
HARNESS_VERSION = "v22-graphify-b3-harness-1.5.0"

# Held-out B1 fallback when official motor cannot run (documented in summary).
B1_FROZEN_H07_H18 = EXP_DIR / "raw" / "battery-held-out-real-engine-005e-hybrid-dev"
B1_FROZEN_H19_H24 = EXP_DIR / "raw" / "battery-held-out-real-engine-005e-hybrid-test"

GRAPHIFY_PIP_PACKAGE = "graphifyy"
GRAPHIFY_UPSTREAM = "https://github.com/Graphify-Labs/graphify"
GRAPHIFY_VENDOR_SITE = "https://graphify.com"

NODE_SRC_RE = re.compile(r"\bsrc=([^\s\]]+)")
GRAPHIFY_OUT = "graphify-out"


def graphify_exe() -> str:
    custom = os.environ.get("GRAPHIFY_BIN", "").strip()
    if custom:
        return custom
    found = shutil.which("graphify")
    return found or "graphify"


def graph_path(repo: Path) -> Path:
    override = os.environ.get("GRAPHIFY_GRAPH", "").strip()
    if override:
        return Path(override).resolve()
    return (repo / GRAPHIFY_OUT / "graph.json").resolve()


def ensure_graph(repo: Path) -> tuple[bool, str]:
    gp = graph_path(repo)
    if gp.is_file():
        return True, str(gp)
    if os.environ.get("V22_B3_SKIP_BUILD", "").strip() in ("1", "true", "yes"):
        return False, f"missing graph: {gp}"
    exe = graphify_exe()
    env = os.environ.copy()
    env.setdefault("GRAPHIFY_NO_TIPS", "1")
    proc = subprocess.run(
        [exe, "update", str(repo), "--no-cluster"],
        cwd=repo,
        capture_output=True,
        text=True,
        env=env,
        check=False,
    )
    if proc.returncode != 0:
        return False, (proc.stderr or proc.stdout or f"graphify update exit {proc.returncode}")[:500]
    if not gp.is_file():
        return False, f"graphify update ok but no graph at {gp}"
    return True, str(gp)


def graph_query_token_budget() -> int:
    return int(os.environ.get("V22_B3_QUERY_TOKEN_BUDGET", "4000"))


def run_graphify_query(repo: Path, query: str) -> tuple[int, str, str]:
    ok, gp_or_err = ensure_graph(repo)
    if not ok:
        return 127, "", gp_or_err
    gp = gp_or_err
    exe = graphify_exe()
    budget = graph_query_token_budget()
    proc = subprocess.run(
        [exe, "query", query, "--budget", str(budget), "--graph", gp],
        cwd=repo,
        capture_output=True,
        text=True,
        check=False,
    )
    out = (proc.stdout or "") + ("\n" + proc.stderr if proc.stderr else "")
    return proc.returncode, out, gp


def paths_from_graphify_output(text: str, repo: Path) -> list[str]:
    """Extract monorepo-relative file paths from graphify query text."""
    banned_prefixes = (
        "docs/internal/historical/evals/",
        "fixtures/evolveloop-project-knowledge/",
    )
    seen: set[str] = set()
    ordered: list[str] = []
    for m in NODE_SRC_RE.finditer(text):
        raw = m.group(1).strip()
        if not raw or raw == "loc=":
            continue
        rel = raw.replace("\\", "/")
        if rel.startswith("./"):
            rel = rel[2:]
        candidates = [rel]
        if not (repo / rel).is_file():
            # graphify sometimes emits short paths; try under orchestrator/
            if (repo / "orchestrator" / rel).is_file():
                candidates.append(f"orchestrator/{rel}")
        for cand in candidates:
            if any(cand.startswith(p) for p in banned_prefixes):
                continue
            if not (repo / cand).is_file():
                continue
            if cand in seen:
                break
            seen.add(cand)
            ordered.append(cand)
            break
    return ordered


@dataclass
class RunResult:
    task_id: str
    arm: str
    paths_read: list[str] = field(default_factory=list)
    graph_paths_ranked: list[str] = field(default_factory=list)
    input_tokens: int = 0
    latency_ms: int = 0
    recall: float = 0.0
    recall_notes: list[str] = field(default_factory=list)
    graphify_exit: int = 0
    graph_path: str = ""


def run_b3(repo: Path, task: dict[str, Any], counter: Callable[[str], int]) -> RunResult:
    t0 = time.perf_counter()
    paths: list[str] = []
    buf: list[str] = []
    max_paths = bench_max_paths()
    max_tokens = bench_max_input_tokens()
    exit_code, text, gp = run_graphify_query(repo, task["query"])
    ranked = paths_from_graphify_output(text, repo) if exit_code == 0 else []
    notes: list[str] = []
    if exit_code != 0:
        notes.append(f"graphify query exit {exit_code}")
    if exit_code == 0 and not ranked:
        notes.append("graphify query returned no repo file paths")
    for rel in ranked:
        if not read_rel(repo, rel, paths, buf, counter, max_paths, max_tokens):
            break
    recall, rnotes = anchor_recall(repo, paths, task["anchors"])
    notes.extend(rnotes)
    tok_in = counter("\n".join(buf))
    elapsed = int((time.perf_counter() - t0) * 1000)
    return RunResult(
        task_id=task["id"],
        arm="B3",
        paths_read=paths,
        graph_paths_ranked=ranked[: max_paths + 5],
        input_tokens=tok_in,
        latency_ms=elapsed,
        recall=recall,
        recall_notes=notes,
        graphify_exit=exit_code,
        graph_path=gp,
    )


def load_tasks() -> list[dict[str, Any]]:
    real = json.loads(TASKS_REAL.read_text(encoding="utf-8"))
    held = json.loads(TASKS_HELD.read_text(encoding="utf-8"))
    held_ids = {f"H{n:02d}" for n in range(7, 25)}
    tasks: list[dict[str, Any]] = list(real["tasks"])
    tasks.extend([t for t in held["tasks"] if t["id"] in held_ids])
    return tasks


def task_split(task_id: str) -> str:
    if task_id.startswith("R"):
        return "R01_R06"
    n = int(task_id[1:])
    if 7 <= n <= 18:
        return "H07_H18_dev"
    if 19 <= n <= 24:
        return "H19_H24_test"
    return "other"


def frozen_b1_run_path(task_id: str) -> Path | None:
    n = int(task_id[1:])
    if 7 <= n <= 18:
        base = B1_FROZEN_H07_H18
    elif 19 <= n <= 24:
        base = B1_FROZEN_H19_H24
    else:
        return None
    p = base / "held-out" / task_id / "B1" / "run-01.json"
    return p if p.is_file() else None


def metrics_from_frozen_b1(task_id: str) -> dict[str, Any] | None:
    p = frozen_b1_run_path(task_id)
    if not p:
        return None
    rec = json.loads(p.read_text(encoding="utf-8"))
    m = rec["metrics"]
    return {
        "task_id": task_id,
        "split": task_split(task_id),
        "arm": "B1",
        "recall": float(m["recall"]),
        "paths": len(m["paths_read"]),
        "tokens": int(m["input_tokens"]),
        "latency_ms": int(m["latency_ms"]),
        "source": str(p.relative_to(EXP_DIR)),
        "harness": rec.get("harness"),
    }


def metrics_row(task_id: str, arm: str, res: RunResult) -> dict[str, Any]:
    return {
        "task_id": task_id,
        "split": task_split(task_id),
        "arm": arm,
        "recall": res.recall,
        "paths": len(res.paths_read),
        "tokens": res.input_tokens,
        "latency_ms": res.latency_ms,
    }


def summarize_arm(rows: list[dict[str, Any]], arm: str) -> dict[str, Any]:
    subset = [r for r in rows if r["arm"] == arm]
    if not subset:
        return {"tasks": 0, "recall_eq_1": 0, "median_paths": 0.0, "median_tokens": 0.0, "median_latency_ms": 0.0}
    recalls = [float(r["recall"]) for r in subset]
    return {
        "tasks": len(subset),
        "recall_eq_1": sum(1 for x in recalls if x >= 1.0),
        "median_paths": median([float(r["paths"]) for r in subset]),
        "median_tokens": median([float(r["tokens"]) for r in subset]),
        "median_latency_ms": median([float(r["latency_ms"]) for r in subset]),
    }


def build_split_tables(flat: list[dict[str, Any]]) -> dict[str, Any]:
    splits = {
        "R01_R06": {
            "label": "real repo tasks (no B1 — curated pack is CIRCULAR)",
            "compare_arms": ["B0", "B3"],
            "b1_note": "PROVISIONAL_CURATED_PACK excluded from comparison",
        },
        "H07_H18_dev": {
            "label": "held-out dev (independent reviewer)",
            "compare_arms": ["B0", "B1", "B3"],
        },
        "H19_H24_test": {
            "label": "held-out test (recall holdout)",
            "compare_arms": ["B0", "B1", "B3"],
        },
    }
    out: dict[str, Any] = {}
    for key, meta in splits.items():
        rows = [r for r in flat if r["split"] == key]
        arms = {a: summarize_arm(rows, a) for a in meta["compare_arms"]}
        if key == "R01_R06":
            arms["B1_CIRCULAR"] = {
                "tasks": 6,
                "recall_eq_1": "N/A",
                "median_paths": "N/A",
                "median_tokens": "N/A",
                "median_latency_ms": "N/A",
                "evidence_class": "PROVISIONAL_CURATED_PACK",
                "excluded": True,
            }
        out[key] = {**meta, "by_arm": arms, "per_task": rows}
    return out


def write_arm_run(
    out_dir: Path,
    suite: str,
    task_id: str,
    arm: str,
    tree_sha: str,
    tok_label: str,
    res: RunResult,
    evidence_class: str,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    rec = {
        "experiment_id": "V22-BENCH-GRAPHIFY-B3",
        "evidence_class": evidence_class,
        "baseline_id": "v22-graphify-b3-coherent-2026-10-22",
        "run_id": f"V22G-{task_id}-{arm}-{hashlib.sha256((tree_sha + task_id + arm).encode()).hexdigest()[:12]}",
        "arm": arm,
        "task_id": task_id,
        "split": task_split(task_id),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "tree_sha": tree_sha,
        "harness": HARNESS_VERSION,
        "ground_harness": GROUND_HARNESS_VERSION,
        "tokenizer": tok_label,
        "metrics": asdict(res),
        "verifier": {"pass": res.recall >= 1.0, "recall": res.recall, "notes": res.recall_notes},
    }
    if extra:
        rec.update(extra)
    d = out_dir / suite / task_id / arm
    d.mkdir(parents=True, exist_ok=True)
    (d / "run-01.json").write_text(json.dumps(rec, indent=2), encoding="utf-8")
    return rec


def run_battery(out_dir: Path) -> dict[str, Any]:
    if GROUND_HARNESS_VERSION != "v22-ground-b1-harness-1.5.0":
        raise RuntimeError(f"expected ground harness 1.5.0, got {GROUND_HARNESS_VERSION}")
    tok_label, counter = load_tokenizer()
    repo = repo_root()
    tree_sha = git_sha(repo)
    tasks = load_tasks()
    cli = graphify_exe()
    cli_version = ""
    try:
        cli_version = subprocess.check_output([cli, "--version"], text=True, stderr=subprocess.STDOUT).strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        cli_version = "NOT_INSTALLED"

    b1_class, b1_env, b1_engine_meta = resolve_b1_class_and_env(repo)
    b1_official_unavailable = b1_class != "OFFICIAL_WIKI_GROUND"
    b1_fallback_note: str | None = None
    if b1_official_unavailable:
        b1_fallback_note = (
            "Held-out B1 rows use frozen runs (harness 1.5.0, PR #10 lineage): "
            f"H07–H18 → {B1_FROZEN_H07_H18.relative_to(EXP_DIR)}; "
            f"H19–H24 → {B1_FROZEN_H19_H24.relative_to(EXP_DIR)}. "
            "B0 and B3 measured live on this VM in the same pass."
        )

    all_runs: list[dict[str, Any]] = []
    flat_metrics: list[dict[str, Any]] = []
    for task in tasks:
        tid = task["id"]
        suite = "real" if tid.startswith("R") else "held-out"
        b0 = run_b0(repo, task, counter)
        rec_b0 = write_arm_run(
            out_dir,
            suite,
            tid,
            "B0",
            tree_sha,
            tok_label,
            b0,
            "OFFICIAL_BASELINE",
        )
        all_runs.append(rec_b0)
        flat_metrics.append(metrics_row(tid, "B0", b0))

        if not tid.startswith("R"):
            frozen_b1 = metrics_from_frozen_b1(tid) if b1_official_unavailable else None
            if frozen_b1:
                flat_metrics.append(frozen_b1)
                rec_b1 = {
                    "arm": "B1",
                    "task_id": tid,
                    "evidence_class": "OFFICIAL_WIKI_GROUND",
                    "frozen_reference": frozen_b1["source"],
                    "harness": frozen_b1.get("harness"),
                    "metrics": {
                        "recall": frozen_b1["recall"],
                        "paths_read": [""] * frozen_b1["paths"],
                        "input_tokens": frozen_b1["tokens"],
                        "latency_ms": frozen_b1["latency_ms"],
                    },
                    "note": "B1 from frozen PR #10 lineage (harness 1.5.0); not re-run on this VM (no karpathyWiki).",
                }
                all_runs.append(rec_b1)
            else:
                b1 = run_b1_ground(repo, task, counter, b1_env)
                rec_b1 = write_arm_run(
                    out_dir,
                    suite,
                    tid,
                    "B1",
                    tree_sha,
                    tok_label,
                    b1,
                    b1_class,
                    extra={"b1_engine": b1_engine_meta},
                )
                all_runs.append(rec_b1)
                flat_metrics.append(metrics_row(tid, "B1", b1))

        b3 = run_b3(repo, task, counter)
        rec_b3 = write_arm_run(
            out_dir,
            suite,
            tid,
            "B3",
            tree_sha,
            tok_label,
            b3,
            "GRAPHIFY_CODE_GRAPH",
            extra={"graphify": {"cli_version": cli_version}},
        )
        all_runs.append(rec_b3)
        flat_metrics.append(metrics_row(tid, "B3", b3))

    aggs: dict[str, dict[str, Any]] = {}
    for r in all_runs:
        m = r["metrics"]
        aggs[f"{r['task_id']}:{r['arm']}"] = {
            "median_paths": float(len(m["paths_read"])),
            "median_input_tokens": float(m["input_tokens"]),
            "median_latency_ms": float(m["latency_ms"]),
            "recall": m["recall"],
        }

    split_tables = build_split_tables(flat_metrics)
    summary = {
        "experiment": "V22-BENCH-GRAPHIFY-B3",
        "classification_by_arm": {
            "B0": "OFFICIAL_BASELINE",
            "B1": b1_class,
            "B3": "GRAPHIFY_CODE_GRAPH",
        },
        "baseline_id": "v22-graphify-b3-coherent-2026-10-22",
        "freeze_tree_sha": tree_sha,
        "harness": HARNESS_VERSION,
        "ground_harness": GROUND_HARNESS_VERSION,
        "anchor_recall_mode": anchor_recall_mode(),
        "bench_max_paths": bench_max_paths(),
        "bench_max_input_tokens": bench_max_input_tokens(),
        "coherent_suite_note": (
            "B0 and B3 (and held-out B1 when motor available) measured in one pass with "
            "ground harness 1.5.0 budgets. R01–R06: compare B0 vs B3 only."
        ),
        "graphify_package": {
            "pip_name": GRAPHIFY_PIP_PACKAGE,
            "pip_version": cli_version.replace("graphify ", "").strip() if cli_version else None,
            "upstream_repo": GRAPHIFY_UPSTREAM,
            "vendor_site": GRAPHIFY_VENDOR_SITE,
            "license": "Apache-2.0 (per upstream README)",
            "note": "PyPI name is graphifyy; CLI binary is graphify (Graphify Labs).",
        },
        "graphify": {
            "cli": cli,
            "cli_version": cli_version,
            "graph_path": str(graph_path(repo)),
            "query_token_budget": graph_query_token_budget(),
            "mode": "local AST (--no-cluster), no --wiki, no LLM",
        },
        "b1_measurement": {
            "live_class": b1_class,
            "engine_meta": b1_engine_meta,
            "official_motor_on_vm": not b1_official_unavailable,
            "frozen_h07_h18": str(B1_FROZEN_H07_H18.relative_to(EXP_DIR)),
            "frozen_h19_h24": str(B1_FROZEN_H19_H24.relative_to(EXP_DIR)),
            "note": b1_fallback_note,
        },
        "aggregates": aggs,
        "split_tables": split_tables,
        "flat_metrics": flat_metrics,
        "environment": {
            "os": platform.platform(),
            "python": platform.python_version(),
        },
        "runs": [r["run_id"] for r in all_runs],
    }
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "b3-summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    (out_dir / "b3-all-runs.json").write_text(json.dumps(all_runs, indent=2), encoding="utf-8")
    (out_dir / "comparison-b0-b1-b3.json").write_text(json.dumps(split_tables, indent=2), encoding="utf-8")
    return summary


if __name__ == "__main__":
    target = EXP_DIR / "raw" / "battery-b3-graphify"
    if len(sys.argv) > 1:
        target = Path(sys.argv[1])
    s = run_battery(target)
    print(
        json.dumps(
            {
                "verdict": "OK",
                "graphify": s["graphify"]["cli_version"],
                "split_tables": {
                    k: v["by_arm"] for k, v in s["split_tables"].items()
                },
            },
            indent=2,
        )
    )
