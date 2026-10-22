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
)

EXP_DIR = Path(__file__).resolve().parents[1]
TASKS_REAL = EXP_DIR / "tasks-real-frozen.json"
TASKS_HELD = EXP_DIR / "tasks-held-out-frozen.json"
HARNESS_VERSION = "v22-graphify-b3-harness-1.5.0"

B0_MANIFEST_REAL = EXP_DIR / "raw" / "battery-real" / "battery-summary.json"
B1_MANIFEST_HELD_H07 = EXP_DIR / "raw" / "battery-held-out-real-engine" / "held-out-summary.json"
B1_MANIFEST_HELD_H19 = (
    EXP_DIR / "raw" / "battery-held-out-real-engine-005e-hybrid-test" / "held-out-summary.json"
)

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


def load_baseline_aggregate(task_id: str, arm: str) -> dict[str, Any] | None:
    key = f"{task_id}:{arm}"
    if task_id.startswith("R"):
        if not B0_MANIFEST_REAL.is_file():
            return None
        ag = json.loads(B0_MANIFEST_REAL.read_text(encoding="utf-8")).get("aggregates", {})
        return ag.get(key)
    n = int(task_id[1:])
    if 7 <= n <= 18:
        manifest = B1_MANIFEST_HELD_H07
    elif 19 <= n <= 24:
        manifest = B1_MANIFEST_HELD_H19
    else:
        return None
    if not manifest.is_file():
        return None
    ag = json.loads(manifest.read_text(encoding="utf-8")).get("aggregates", {})
    return ag.get(key)


def comparison_row(task_id: str, b3: RunResult) -> dict[str, Any]:
    b0 = load_baseline_aggregate(task_id, "B0")
    b1 = load_baseline_aggregate(task_id, "B1")
    b1_source = None
    if task_id.startswith("R"):
        b1_source = str(B0_MANIFEST_REAL.relative_to(EXP_DIR))
    elif task_id[1:].isdigit():
        n = int(task_id[1:])
        if 7 <= n <= 18:
            b1_source = str(B1_MANIFEST_HELD_H07.relative_to(EXP_DIR))
        elif 19 <= n <= 24:
            b1_source = str(B1_MANIFEST_HELD_H19.relative_to(EXP_DIR))
    return {
        "task_id": task_id,
        "B0_recall": b0.get("recall") if b0 else None,
        "B0_paths": b0.get("median_paths") if b0 else None,
        "B0_tokens": b0.get("median_input_tokens") if b0 else None,
        "B1_recall": b1.get("recall") if b1 else None,
        "B1_paths": b1.get("median_paths") if b1 else None,
        "B1_tokens": b1.get("median_input_tokens") if b1 else None,
        "B1_manifest_source": b1_source,
        "B3_recall": b3.recall,
        "B3_paths": len(b3.paths_read),
        "B3_tokens": b3.input_tokens,
        "B3_latency_ms": b3.latency_ms,
    }


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

    all_runs: list[dict[str, Any]] = []
    comparison: list[dict[str, Any]] = []
    for task in tasks:
        res = run_b3(repo, task, counter)
        rec = {
            "experiment_id": "V22-BENCH-GRAPHIFY-B3",
            "evidence_class": "GRAPHIFY_CODE_GRAPH",
            "baseline_id": "v22-graphify-b3-2026-10-22",
            "run_id": f"V22G-{task['id']}-B3-{hashlib.sha256((tree_sha + task['id'] + 'B3').encode()).hexdigest()[:12]}",
            "arm": "B3",
            "task_id": task["id"],
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "tree_sha": tree_sha,
            "harness": HARNESS_VERSION,
            "ground_harness": GROUND_HARNESS_VERSION,
            "tokenizer": tok_label,
            "metrics": asdict(res),
            "verifier": {"pass": res.recall >= 1.0, "recall": res.recall, "notes": res.recall_notes},
        }
        all_runs.append(rec)
        comparison.append(comparison_row(task["id"], res))
        suite = "real" if task["id"].startswith("R") else "held-out"
        d = out_dir / suite / task["id"] / "B3"
        d.mkdir(parents=True, exist_ok=True)
        (d / "run-01.json").write_text(json.dumps(rec, indent=2), encoding="utf-8")

    aggs: dict[str, dict[str, Any]] = {}
    for r in all_runs:
        m = r["metrics"]
        aggs[f"{r['task_id']}:B3"] = {
            "median_paths": float(len(m["paths_read"])),
            "median_input_tokens": float(m["input_tokens"]),
            "median_latency_ms": float(m["latency_ms"]),
            "recall": m["recall"],
        }

    b3_recalls = [c["B3_recall"] for c in comparison]
    summary = {
        "experiment": "V22-BENCH-GRAPHIFY-B3",
        "classification_by_arm": {"B3": "GRAPHIFY_CODE_GRAPH"},
        "baseline_id": "v22-graphify-b3-2026-10-22",
        "freeze_tree_sha": tree_sha,
        "harness": HARNESS_VERSION,
        "anchor_recall_mode": anchor_recall_mode(),
        "bench_max_paths": bench_max_paths(),
        "bench_max_input_tokens": bench_max_input_tokens(),
        "graphify": {
            "cli": cli,
            "cli_version": cli_version,
            "graph_path": str(graph_path(repo)),
            "query_token_budget": graph_query_token_budget(),
            "mode": "local AST (--no-cluster), no --wiki, no LLM",
        },
        "b0_b1_reference_manifests": {
            "R01_R06": str(B0_MANIFEST_REAL.relative_to(EXP_DIR)),
            "H07_H18_B1": str(B1_MANIFEST_HELD_H07.relative_to(EXP_DIR)),
            "H19_H24_B1": str(B1_MANIFEST_HELD_H19.relative_to(EXP_DIR)),
            "note": "B0/B1 not re-run in this VM; comparison pulls frozen aggregates (PR #10 lineage for held-out official wiki).",
        },
        "aggregates": aggs,
        "comparison_b0_b1_b3": comparison,
        "rollups": {
            "B3_median_recall": median(b3_recalls),
            "B3_median_paths": median([len(r["metrics"]["paths_read"]) for r in all_runs]),
            "B3_median_tokens": median([r["metrics"]["input_tokens"] for r in all_runs]),
            "B3_tasks_recall_1": sum(1 for x in b3_recalls if x >= 1.0),
            "B3_task_count": len(b3_recalls),
        },
        "environment": {
            "os": platform.platform(),
            "python": platform.python_version(),
        },
        "runs": [r["run_id"] for r in all_runs],
    }
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "b3-summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    (out_dir / "b3-all-runs.json").write_text(json.dumps(all_runs, indent=2), encoding="utf-8")
    (out_dir / "comparison-b0-b1-b3.json").write_text(json.dumps(comparison, indent=2), encoding="utf-8")
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
                "rollups": s["rollups"],
            },
            indent=2,
        )
    )
