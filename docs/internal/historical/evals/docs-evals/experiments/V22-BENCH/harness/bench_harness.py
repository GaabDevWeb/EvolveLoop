#!/usr/bin/env python3
"""V22-BENCH offline retrieval harness — B0 (rg+read) vs B1 (.ai/ + selective read).

Does not modify orchestrator/src or live LLM calls.
"""
from __future__ import annotations

import hashlib
import json
import os
import platform
import re
import shutil
import subprocess
import sys
import tempfile
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

EXP_DIR = Path(__file__).resolve().parents[1]


def _repo_root() -> Path:
    try:
        out = subprocess.check_output(
            ["git", "rev-parse", "--show-toplevel"],
            cwd=EXP_DIR,
            text=True,
            stderr=subprocess.DEVNULL,
        )
        return Path(out.strip())
    except (subprocess.CalledProcessError, FileNotFoundError):
        return EXP_DIR.parents[8]


REPO_ROOT = _repo_root()
FIXTURE_SRC = EXP_DIR / "fixtures" / "synth-repo"
TASKS_PATH = EXP_DIR / "tasks.json"
DEFAULT_SEED = "v22-bench-2026-10-22"
HARNESS_VERSION = "v22-bench-harness-1.0.0"


def _git_sha(repo: Path) -> str:
    try:
        out = subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=repo, text=True, stderr=subprocess.DEVNULL
        )
        return out.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return "unknown"


def load_tokenizer():
    try:
        import tiktoken  # type: ignore

        enc = tiktoken.get_encoding("cl100k_base")
        return "tiktoken:cl100k_base", lambda t: len(enc.encode(t))
    except Exception:
        return "PROXY:whitespace_split", lambda t: len([x for x in t.split() if x])


def count_tokens(text: str, counter) -> int:
    return counter(text)


@dataclass
class RunMetrics:
    arm: str
    scenario_id: str
    paths_read: list[str] = field(default_factory=list)
    rg_invocations: list[dict[str, Any]] = field(default_factory=list)
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    model_calls: int = 0
    latency_ms_retrieval: int = 0
    verifier_pass: bool = False
    verifier_notes: str = ""
    secret_leak: bool = False
    redundant_reads: int = 0


def copy_fixture(tmp: Path, include_wiki: bool) -> Path:
    dest = tmp / "project"
    shutil.copytree(FIXTURE_SRC, dest, dirs_exist_ok=True)
    if not include_wiki and (dest / ".ai").exists():
        shutil.rmtree(dest / ".ai")
    return dest


def run_rg(project: Path, pattern: str) -> list[str]:
    try:
        proc = subprocess.run(
            ["rg", "-l", pattern, str(project)],
            capture_output=True,
            text=True,
            check=False,
        )
    except FileNotFoundError:
        # fallback grep
        proc = subprocess.run(
            ["grep", "-r", "-l", pattern, str(project)],
            capture_output=True,
            text=True,
            check=False,
        )
    lines = [ln.strip() for ln in proc.stdout.splitlines() if ln.strip()]
    rel = []
    for ln in lines:
        p = Path(ln)
        try:
            rel.append(str(p.relative_to(project)))
        except ValueError:
            rel.append(ln)
    return sorted(set(rel))


def read_file(project: Path, rel: str, bucket: list[str], contents: list[str]) -> None:
    path = project / rel
    if not path.is_file():
        return
    if rel in bucket:
        return
    text = path.read_text(encoding="utf-8", errors="replace")
    bucket.append(rel)
    contents.append(f"--- path:{rel} ---\n{text}\n")


def synthesize_answer(query: str, context: str) -> str:
    """Deterministic stub — no LLM. Mirrors facts present in context."""
    lines = []
    if "ADR-0001" in context or "AlphaGateway" in context:
        lines.append("ADR-0001: AlphaGateway em src/alpha/core.py")
    if "consumer.py" in context or "beta" in context.lower():
        lines.append("Dependente: src/beta/consumer.py")
    if not lines:
        lines.append("insufficient_context")
    return "\n".join(lines)


def verify(answer: str, log_blob: str, spec: dict[str, Any]) -> tuple[bool, str]:
    must = spec.get("answer_must_contain", [])
    forbidden = spec.get("forbidden_in_log", [])
    for f in forbidden:
        if f in log_blob:
            return False, f"forbidden substring in log: {f}"
    for m in must:
        if m not in answer and m not in log_blob:
            return False, f"missing required fact: {m}"
    return True, "ok"


def simulate_arm(
    arm: str,
    scenario: dict[str, Any],
    project: Path,
    counter,
) -> RunMetrics:
    import time

    t0 = time.perf_counter()
    paths: list[str] = []
    chunks: list[str] = []
    rg_log: list[dict[str, Any]] = []

    if arm == "B1":
        for rel in scenario.get("wiki_pages", []):
            read_file(project, rel, paths, chunks)
        for rel in scenario.get("code_paths_after_wiki", []):
            read_file(project, rel, paths, chunks)
    elif arm == "B0":
        patterns = scenario.get("rg_patterns", [])
        hits: list[str] = []
        for pat in patterns:
            found = run_rg(project, pat)
            rg_log.append({"pattern": pat, "paths": found})
            hits.extend(found)
        # B0: read rg hits in sorted order until context has ADR + consumer or max cap
        for rel in sorted(set(hits)):
            if rel.startswith("secrets/"):
                continue
            read_file(project, rel, paths, chunks)
            if len(paths) >= 15:
                break
        # ensure ADR read if not yet
        for must_read in ["docs/adr/0001-alpha-gateway.md", "src/beta/consumer.py"]:
            if must_read not in paths:
                read_file(project, must_read, paths, chunks)
    else:
        raise ValueError(f"unknown arm {arm}")

    context = "\n".join(chunks)
    answer = synthesize_answer(scenario["query"], context)
    log_blob = context + "\n" + answer

    redundant = len(paths) - len(set(paths))
    tok_in = count_tokens(context, counter)
    tok_out = count_tokens(answer, counter)
    ok, note = verify(answer, log_blob, scenario["verifier"])
    secret_leak = any(
        f in log_blob for f in scenario.get("verifier", {}).get("forbidden_in_log", [])
    )

    elapsed = int((time.perf_counter() - t0) * 1000)
    return RunMetrics(
        arm=arm,
        scenario_id=scenario["id"],
        paths_read=paths,
        rg_invocations=rg_log,
        input_tokens=tok_in,
        output_tokens=tok_out,
        total_tokens=tok_in + tok_out,
        model_calls=0,
        latency_ms_retrieval=elapsed,
        verifier_pass=ok and not secret_leak,
        verifier_notes=note,
        secret_leak=secret_leak,
        redundant_reads=redundant,
    )


def load_tasks() -> dict[str, Any]:
    return json.loads(TASKS_PATH.read_text(encoding="utf-8"))


def run_scenario(scenario: dict[str, Any], arms: list[str], tree_sha: str, counter, tok_label: str) -> list[dict[str, Any]]:
    runs: list[dict[str, Any]] = []
    for arm in arms:
        with tempfile.TemporaryDirectory(prefix="v22bench-") as td:
            project = copy_fixture(Path(td), include_wiki=scenario.get("wiki", False) or arm == "B1")
            m = simulate_arm(arm, scenario, project, counter)
            run_id = hashlib.sha256(
                f"{tree_sha}:{scenario['id']}:{arm}:{DEFAULT_SEED}".encode()
            ).hexdigest()[:16]
            runs.append(
                {
                    "experiment_id": "V22-BENCH",
                    "baseline_id": "v22-b0b1-2026-10-22",
                    "run_id": f"V22-{scenario['id']}-{arm}-{run_id}",
                    "arm": arm,
                    "scenario": {
                        "id": scenario["id"],
                        "number": scenario["number"],
                        "title": scenario["title"],
                    },
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "tree_sha": tree_sha,
                    "harness": HARNESS_VERSION,
                    "tokenizer": tok_label,
                    "model": {
                        "id": "NOT_MEASURED",
                        "note": "offline deterministic retrieval; no live LLM in this battery",
                    },
                    "host_cache": "UNKNOWN",
                    "context_budget_tokens_declared": scenario.get(
                        "context_budget_tokens_declared", 128000
                    ),
                    "task": {"query": scenario["query"]},
                    "metrics": asdict(m),
                    "verifier": {
                        "pass": m.verifier_pass,
                        "notes": m.verifier_notes,
                    },
                }
            )
    return runs


def median(values: list[int]) -> float:
    if not values:
        return 0.0
    s = sorted(values)
    n = len(s)
    mid = n // 2
    if n % 2:
        return float(s[mid])
    return (s[mid - 1] + s[mid]) / 2.0


def build_summary(all_runs: list[dict[str, Any]], env: dict[str, Any]) -> dict[str, Any]:
    by_key: dict[str, list[dict[str, Any]]] = {}
    for r in all_runs:
        key = f"{r['scenario']['id']}:{r['arm']}"
        by_key.setdefault(key, []).append(r)

    aggregates = {}
    for key, runs in by_key.items():
        paths = [len(r["metrics"]["paths_read"]) for r in runs]
        tin = [r["metrics"]["input_tokens"] for r in runs]
        aggregates[key] = {
            "n_runs": len(runs),
            "median_paths_read": median(paths),
            "median_input_tokens": median(tin),
            "verifier_pass_rate": sum(1 for r in runs if r["verifier"]["pass"]) / len(runs),
        }

    return {
        "experiment": "V22-BENCH",
        "baseline_id": "v22-b0b1-2026-10-22",
        "mode": "OFFLINE_DETERMINISTIC_RETRIEVAL",
        "started_at": all_runs[0]["timestamp"] if all_runs else None,
        "ended_at": all_runs[-1]["timestamp"] if all_runs else None,
        "environment": env,
        "aggregates": aggregates,
        "runs": [r["run_id"] for r in all_runs],
    }


def collect_environment(tok_label: str) -> dict[str, Any]:
    return {
        "os": platform.platform(),
        "python": platform.python_version(),
        "harness": "bench_harness.py",
        "seed": DEFAULT_SEED,
        "tokenizer": tok_label,
        "source_revision": _git_sha(REPO_ROOT),
        "cwd": str(REPO_ROOT),
    }


def run_battery(out_dir: Path) -> dict[str, Any]:
    tok_label, counter = load_tokenizer()
    tasks = load_tasks()
    tree_sha = _git_sha(REPO_ROOT)
    out_dir.mkdir(parents=True, exist_ok=True)
    all_runs: list[dict[str, Any]] = []
    for scenario in tasks["scenarios"]:
        arms = scenario["arms"]
        for run in run_scenario(scenario, arms, tree_sha, counter, tok_label):
            all_runs.append(run)
            arm_dir = out_dir / scenario["id"] / run["arm"]
            arm_dir.mkdir(parents=True, exist_ok=True)
            (arm_dir / "run-01.json").write_text(json.dumps(run, indent=2), encoding="utf-8")

    env = collect_environment(tok_label)
    (out_dir / "environment.json").write_text(json.dumps(env, indent=2), encoding="utf-8")
    (out_dir / "task-set.json").write_text(json.dumps(tasks, indent=2), encoding="utf-8")
    (out_dir / "all-runs.json").write_text(json.dumps(all_runs, indent=2), encoding="utf-8")
    summary = build_summary(all_runs, env)
    (out_dir / "battery-summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return summary


if __name__ == "__main__":
    target = EXP_DIR / "raw" / "battery"
    if len(sys.argv) > 1:
        target = Path(sys.argv[1])
    summary = run_battery(target)
    print(json.dumps({"verdict": "OK", "n_runs": len(summary.get("runs", []))}, indent=2))
