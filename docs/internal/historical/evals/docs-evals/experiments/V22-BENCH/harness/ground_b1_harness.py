#!/usr/bin/env python3
"""V22-BENCH — B0 vs B1 (ground.sh / gaabwiki) on held-out frozen tasks."""
from __future__ import annotations

import hashlib
import json
import os
import platform
import re
import subprocess
import sys
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

EXP_DIR = Path(__file__).resolve().parents[1]
TASKS_HELD = EXP_DIR / "tasks-held-out-frozen.json"
HARNESS_VERSION = "v22-ground-b1-harness-1.1.0"
B1_EVIDENCE_CLASS = "FIXTURE_WIKI_GROUND"
B0_CAP = 45
RG_GLOBS = [
    "!node_modules",
    "!.git",
    "!dist",
    "!**/.venv",
    "!agent-setup/.venv",
    "!docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/raw/**",
]
def repo_root() -> Path:
    out = subprocess.check_output(
        ["git", "rev-parse", "--show-toplevel"], cwd=EXP_DIR, text=True
    )
    return Path(out.strip())


def git_sha(repo: Path) -> str:
    return subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=repo, text=True).strip()


def load_tokenizer() -> tuple[str, Callable[[str], int]]:
    try:
        import tiktoken

        enc = tiktoken.get_encoding("cl100k_base")
        return "tiktoken:cl100k_base", lambda t: len(enc.encode(t))
    except Exception:
        return "PROXY:whitespace_split", lambda t: len([x for x in t.split() if x])


def run_rg(root: Path, pattern: str) -> list[str]:
    cmd = ["rg", "-l", pattern, str(root), "--glob", RG_GLOBS[0]]
    for g in RG_GLOBS[1:]:
        cmd.extend(["--glob", g])
    proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
    rel: list[str] = []
    for ln in proc.stdout.splitlines():
        ln = ln.strip()
        if not ln:
            continue
        p = Path(ln)
        try:
            rel.append(str(p.relative_to(root)))
        except ValueError:
            rel.append(ln)
    return sorted(set(rel))


def read_rel(root: Path, rel: str, paths: list[str], buf: list[str]) -> None:
    if rel in paths:
        return
    fp = root / rel
    if not fp.is_file():
        return
    text = fp.read_text(encoding="utf-8", errors="replace")
    paths.append(rel)
    buf.append(f"--- {rel} ---\n{text}\n")


def anchor_recall(root: Path, paths_read: list[str], anchors: list[dict[str, Any]]) -> tuple[float, list[str]]:
    notes: list[str] = []
    hit = 0
    for a in anchors:
        rel = a["path"]
        line_no = int(a["line"])
        sub = a["substring"]
        fp = root / rel
        if rel not in paths_read:
            notes.append(f"miss path not read: {rel}")
            continue
        if not fp.is_file():
            notes.append(f"miss file missing: {rel}")
            continue
        lines = fp.read_text(encoding="utf-8", errors="replace").splitlines()
        if line_no < 1 or line_no > len(lines):
            notes.append(f"miss line OOB: {rel}:{line_no}")
            continue
        if sub in lines[line_no - 1]:
            hit += 1
        else:
            notes.append(f"miss substring @ {rel}:{line_no}")
    total = len(anchors) or 1
    return hit / total, notes


@dataclass
class RunResult:
    task_id: str
    arm: str
    paths_read: list[str] = field(default_factory=list)
    input_tokens: int = 0
    latency_ms: int = 0
    recall: float = 0.0
    recall_notes: list[str] = field(default_factory=list)
    ground_exit: int = 0
    stale_hits: int = 0


def run_b0(root: Path, task: dict[str, Any], counter) -> RunResult:
    t0 = time.perf_counter()
    paths: list[str] = []
    buf: list[str] = []
    hits: list[str] = []
    for pat in task["rg_patterns"]:
        hits.extend(run_rg(root, pat))
    for rel in sorted(set(hits)):
        read_rel(root, rel, paths, buf)
        if len(paths) >= B0_CAP:
            break
    recall, notes = anchor_recall(root, paths, task["anchors"])
    tok_in = counter("\n".join(buf))
    elapsed = int((time.perf_counter() - t0) * 1000)
    return RunResult(task_id=task["id"], arm="B0", paths_read=paths, input_tokens=tok_in, latency_ms=elapsed, recall=recall, recall_notes=notes)


def run_ground_json(query: str, env: dict[str, str]) -> dict[str, Any]:
    vault = env["WIKI_ROOT"]
    py = env.get("WIKI_PYTHON", f"{vault}/.venv/bin/python")
    raw = subprocess.run(
        [py, "-m", "gaabwiki", "search", query, "--json", "--top-k", "4"],
        capture_output=True,
        text=True,
        env=env,
        check=False,
    )
    if raw.returncode != 0:
        return {"status": "error", "stderr": raw.stderr, "exit": raw.returncode}
    return json.loads(raw.stdout or "{}")


def run_b1_ground(root: Path, task: dict[str, Any], counter, env: dict[str, str]) -> RunResult:
    t0 = time.perf_counter()
    paths: list[str] = []
    buf: list[str] = []
    # B1 must use natural-language task query only — rg_patterns are B0 gabarito (no leakage).
    data = run_ground_json(task["query"], env)
    stale = 0
    for hit in data.get("selected") or []:
        src = hit.get("source") or {}
        if src.get("stale"):
            stale += 1
            continue
        rel = src.get("file")
        if rel:
            read_rel(root, rel, paths, buf)
        buf.append(hit.get("content") or "")
    recall, notes = anchor_recall(root, paths, task["anchors"])
    if stale:
        notes.append(f"skipped {stale} stale hits")
    tok_in = counter("\n".join(buf))
    elapsed = int((time.perf_counter() - t0) * 1000)
    return RunResult(
        task_id=task["id"],
        arm="B1",
        paths_read=paths,
        input_tokens=tok_in,
        latency_ms=elapsed,
        recall=recall,
        recall_notes=notes,
        ground_exit=0,
        stale_hits=stale,
    )


def median(vals: list[float]) -> float:
    if not vals:
        return 0.0
    s = sorted(vals)
    n = len(s)
    m = n // 2
    return float(s[m]) if n % 2 else (s[m - 1] + s[m]) / 2.0


def run_battery(out_dir: Path) -> dict[str, Any]:
    tok_label, counter = load_tokenizer()
    repo = repo_root()
    tree_sha = git_sha(repo)
    spec = json.loads(TASKS_HELD.read_text(encoding="utf-8"))
    spec["freeze_tree_sha"] = tree_sha
    vault = repo / "fixtures" / "evolveloop-wiki-vault"
    env = os.environ.copy()
    env["WIKI_ROOT"] = str(vault)
    env["AGENTS_ROOT"] = str(repo)
    env["EVOLVELOOP_MONOREPO_ROOT"] = str(repo)
    env["WIKI_PYTHON"] = str(vault / ".venv" / "bin" / "python")

    all_runs: list[dict[str, Any]] = []
    for task in spec["tasks"]:
        for arm in ("B0", "B1"):
            if arm == "B0":
                res = run_b0(repo, task, counter)
            else:
                res = run_b1_ground(repo, task, counter, env)
            rec = {
                "experiment_id": "V22-BENCH-HELD-OUT",
                "evidence_class": "OFFICIAL_BASELINE" if arm == "B0" else B1_EVIDENCE_CLASS,
                "baseline_id": "v22-held-out-b0b1-ground-2026-10-22-review",
                "run_id": f"V22H-{task['id']}-{arm}-{hashlib.sha256((tree_sha+task['id']+arm).encode()).hexdigest()[:12]}",
                "arm": arm,
                "task_id": task["id"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "tree_sha": tree_sha,
                "harness": HARNESS_VERSION,
                "tokenizer": tok_label,
                "metrics": asdict(res),
                "verifier": {"pass": res.recall >= 1.0, "recall": res.recall, "notes": res.recall_notes},
            }
            all_runs.append(rec)
            d = out_dir / "held-out" / task["id"] / arm
            d.mkdir(parents=True, exist_ok=True)
            (d / "run-01.json").write_text(json.dumps(rec, indent=2), encoding="utf-8")

    aggs: dict[str, list[dict[str, Any]]] = {}
    for r in all_runs:
        aggs.setdefault(f"{r['task_id']}:{r['arm']}", []).append(r["metrics"])

    summary_aggs = {}
    for key, ms in aggs.items():
        summary_aggs[key] = {
            "median_paths": median([len(x["paths_read"]) for x in ms]),
            "median_input_tokens": median([x["input_tokens"] for x in ms]),
            "median_latency_ms": median([x["latency_ms"] for x in ms]),
            "recall": ms[0]["recall"],
        }

    b0 = [summary_aggs[k] for k in summary_aggs if k.endswith(":B0")]
    b1 = [summary_aggs[k] for k in summary_aggs if k.endswith(":B1")]

    summary = {
        "experiment": "V22-BENCH-HELD-OUT",
        "classification_by_arm": {
            "B0": "OFFICIAL_BASELINE",
            "B1": B1_EVIDENCE_CLASS,
        },
        "baseline_id": "v22-held-out-b0b1-ground-2026-10-22-review",
        "harness_notes": {
            "b1_query": "task.query only (rg_patterns reserved for B0)",
            "wiki_cli": "fixtures/evolveloop-wiki-vault gaabwiki (minimal in-repo fixture)",
        },
        "freeze_tree_sha": tree_sha,
        "tasks_frozen": str(TASKS_HELD.relative_to(EXP_DIR)),
        "aggregates": summary_aggs,
        "rollups": {
            "held_out_B0_median_paths": median([a["median_paths"] for a in b0]),
            "held_out_B1_median_paths": median([a["median_paths"] for a in b1]),
            "held_out_B0_median_tokens": median([a["median_input_tokens"] for a in b0]),
            "held_out_B1_median_tokens": median([a["median_input_tokens"] for a in b1]),
            "held_out_B0_median_latency_ms": median([a["median_latency_ms"] for a in b0]),
            "held_out_B1_median_latency_ms": median([a["median_latency_ms"] for a in b1]),
        },
        "environment": {
            "os": platform.platform(),
            "wiki_root": str(vault),
            "ground_sh": str(repo / ".cursor" / "skills" / "wiki" / "scripts" / "ground.sh"),
            "contamination_guard": "generate-evolveloop-wiki-knowledge.sh allowlist; no V22-BENCH reads",
        },
        "runs": [r["run_id"] for r in all_runs],
    }
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "held-out-summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    (out_dir / "held-out-all-runs.json").write_text(json.dumps(all_runs, indent=2), encoding="utf-8")
    return summary


if __name__ == "__main__":
    target = EXP_DIR / "raw" / "battery-held-out"
    if len(sys.argv) > 1:
        target = Path(sys.argv[1])
    s = run_battery(target)
    print(json.dumps({"verdict": "OK", "rollups": s["rollups"]}, indent=2))
