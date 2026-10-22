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

OFFICIAL_HYBRID_RUN = EXP_DIR / "raw" / "battery-held-out-official-hybrid" / "run-01"
OFFICIAL_MANIFEST = EXP_DIR / "raw" / "battery-held-out-official-hybrid" / "OFFICIAL-MANIFEST.json"

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
    from v22_anchor_scorer import SCORER_VERSION, rescore_run_metrics

    scored = rescore_run_metrics(repo, paths, task["anchors"])
    recall = float(scored["recall"])
    rnotes = list(scored["recall_notes"])
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
    held_ids = {f"H{n:02d}" for n in range(7, 25)}
    if os.environ.get("V22_B3_SUITE", "official-held-out").strip() == "official-held-out":
        held = json.loads(TASKS_HELD.read_text(encoding="utf-8"))
        return [t for t in held["tasks"] if t["id"] in held_ids]
    real = json.loads(TASKS_REAL.read_text(encoding="utf-8"))
    held = json.loads(TASKS_HELD.read_text(encoding="utf-8"))
    tasks: list[dict[str, Any]] = list(real["tasks"])
    tasks.extend([t for t in held["tasks"] if t["id"] in held_ids])
    return tasks


def official_split_dir(task_id: str) -> str:
    n = int(task_id[1:])
    return "dev" if 7 <= n <= 18 else "test"


def official_arm_run_path(task_id: str, arm: str) -> Path:
    root = Path(os.environ.get("V22_OFFICIAL_HYBRID_RUN", str(OFFICIAL_HYBRID_RUN)))
    return root / official_split_dir(task_id) / "held-out" / task_id / arm / "run-01.json"


def run_result_from_official_json(
    task: dict[str, Any], arm: str, repo: Path
) -> tuple[RunResult, str]:
    from v22_anchor_scorer import rescore_run_metrics

    path = official_arm_run_path(task["id"], arm)
    if not path.is_file():
        raise FileNotFoundError(path)
    rec = json.loads(path.read_text(encoding="utf-8"))
    m = rec["metrics"]
    paths = list(m.get("paths_read") or [])
    scored = rescore_run_metrics(repo, paths, task["anchors"])
    return (
        RunResult(
            task_id=task["id"],
            arm=arm,
            paths_read=paths,
            input_tokens=int(m.get("input_tokens", 0)),
            latency_ms=int(m.get("latency_ms", 0)),
            recall=float(scored["recall"]),
            recall_notes=scored["recall_notes"],
        ),
        str(path.relative_to(EXP_DIR)),
    )


def task_split(task_id: str) -> str:
    if task_id.startswith("R"):
        return "R01_R06"
    n = int(task_id[1:])
    if 7 <= n <= 18:
        return "H07_H18_dev"
    if 19 <= n <= 24:
        return "H19_H24_test"
    return "other"


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
        "H07_H18_dev": {
            "label": "held-out dev — OFFICIAL_WIKI_GROUND hybrid (run-01)",
            "compare_arms": ["B0", "B1", "B3"],
        },
        "H19_H24_test": {
            "label": "held-out test — OFFICIAL_WIKI_GROUND hybrid (run-01)",
            "compare_arms": ["B0", "B1", "B3"],
        },
    }
    if any(r["split"] == "R01_R06" for r in flat):
        splits = {
            "R01_R06": {
                "label": "real repo tasks (no B1 — curated pack is CIRCULAR)",
                "compare_arms": ["B0", "B3"],
                "b1_note": "PROVISIONAL_CURATED_PACK excluded from comparison",
            },
            **splits,
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

    use_official_b0b1 = os.environ.get("V22_B3_SUITE", "official-held-out") == "official-held-out"
    from v22_anchor_scorer import SCORER_VERSION

    all_runs: list[dict[str, Any]] = []
    flat_metrics: list[dict[str, Any]] = []
    for task in tasks:
        tid = task["id"]
        suite = "real" if tid.startswith("R") else "held-out"
        if use_official_b0b1 and not tid.startswith("R"):
            b0, b0_src = run_result_from_official_json(task, "B0", repo)
            rec_b0 = write_arm_run(
                out_dir,
                suite,
                tid,
                "B0",
                tree_sha,
                tok_label,
                b0,
                "OFFICIAL_BASELINE",
                extra={"official_reference": b0_src, "scorer_version": SCORER_VERSION},
            )
            all_runs.append(rec_b0)
            flat_metrics.append(metrics_row(tid, "B0", b0))

            b1, b1_src = run_result_from_official_json(task, "B1", repo)
            rec_b1 = write_arm_run(
                out_dir,
                suite,
                tid,
                "B1",
                tree_sha,
                tok_label,
                b1,
                "OFFICIAL_WIKI_GROUND",
                extra={"official_reference": b1_src, "scorer_version": SCORER_VERSION},
            )
            all_runs.append(rec_b1)
            flat_metrics.append(metrics_row(tid, "B1", b1))
        else:
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
                extra={"scorer_version": SCORER_VERSION},
            )
            all_runs.append(rec_b0)
            flat_metrics.append(metrics_row(tid, "B0", b0))

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
            extra={
                "graphify": {"cli_version": cli_version},
                "scorer_version": SCORER_VERSION,
            },
        )
        all_runs.append(rec_b3)
        flat_metrics.append(metrics_row(tid, "B3", b3))

    unified = {
        "dev": build_split_tables(flat_metrics).get("H07_H18_dev", {}).get("by_arm", {}),
        "test": build_split_tables(flat_metrics).get("H19_H24_test", {}).get("by_arm", {}),
    }

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
            "B1": "OFFICIAL_WIKI_GROUND",
            "B3": "GRAPHIFY_CODE_GRAPH",
        },
        "baseline_id": "v22-graphify-b3-official-unified-2026-10-22",
        "freeze_tree_sha": tree_sha,
        "harness": HARNESS_VERSION,
        "ground_harness": GROUND_HARNESS_VERSION,
        "anchor_recall_mode": anchor_recall_mode(),
        "canonical_scorer": SCORER_VERSION,
        "bench_max_paths": bench_max_paths(),
        "bench_max_input_tokens": bench_max_input_tokens(),
        "coherent_suite_note": (
            "Held-out: B0/B1 paths+tokens from OFFICIAL-MANIFEST run-01 hybrid; recall re-scored with "
            f"{SCORER_VERSION} on current tree. B3 re-measured live (graphify). "
            "Tokenizer tiktoken:cl100k_base when V22_BENCH_TOKENIZER=tiktoken."
        ),
        "official_manifest": str(OFFICIAL_MANIFEST.relative_to(EXP_DIR)),
        "official_hybrid_run": str(
            Path(os.environ.get("V22_OFFICIAL_HYBRID_RUN", str(OFFICIAL_HYBRID_RUN))).relative_to(EXP_DIR)
        ),
        "unified_official_table": unified,
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
