#!/usr/bin/env python3
"""V22-BENCH — B0/B1 on real EvolveLoop corpus + continuity fixture S03/S07."""
from __future__ import annotations

import hashlib
import json
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
TASKS_FROZEN = EXP_DIR / "tasks-real-frozen.json"
KNOWLEDGE_PACK = EXP_DIR / "fixtures" / "evolveloop-project-knowledge" / ".ai"
CONTINUITY_ROOT = EXP_DIR / "fixtures" / "continuity-s37"
HARNESS_VERSION = "v22-real-corpus-harness-1.0.0"
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


def parse_frontmatter(md: str) -> tuple[dict[str, Any], str]:
    if not md.startswith("---"):
        return {}, md
    end = md.find("\n---", 3)
    if end == -1:
        return {}, md
    fm = md[3:end]
    body = md[end + 4 :]
    data: dict[str, Any] = {}
    for line in fm.splitlines():
        if line.startswith("source_paths:"):
            continue
        if line.strip().startswith("- "):
            data.setdefault("source_paths", []).append(line.strip()[2:].strip())
            continue
        m = re.match(r"^(\w+):\s*(.+)$", line)
        if m:
            key, val = m.group(1), m.group(2).strip()
            if key == "keywords":
                data[key] = val.split()
            else:
                data[key] = val
    return data, body


def load_wiki_pages(ai_root: Path) -> list[dict[str, Any]]:
    pages_dir = ai_root / "pages"
    pages: list[dict[str, Any]] = []
    for p in sorted(pages_dir.glob("*.md")):
        text = p.read_text(encoding="utf-8")
        meta, body = parse_frontmatter(text)
        rel = str(p.relative_to(ai_root.parent))
        pages.append(
            {
                "rel": rel,
                "meta": meta,
                "body": body,
                "keywords": meta.get("keywords", []),
            }
        )
    return pages


def rank_pages(query: str, pages: list[dict[str, Any]], top_k: int = 2) -> list[dict[str, Any]]:
    qtok = set(re.findall(r"[a-zA-Z0-9_./-]+", query.lower()))
    scored: list[tuple[float, dict[str, Any]]] = []
    for page in pages:
        kws = {str(k).lower() for k in page.get("keywords", [])}
        body_tok = set(re.findall(r"[a-zA-Z0-9_./-]+", page["body"].lower()))
        score = len(qtok & kws) * 2 + len(qtok & body_tok)
        scored.append((score, page))
    scored.sort(key=lambda x: (-x[0], x[1]["rel"]))
    return [p for s, p in scored if s > 0][:top_k] or [scored[0][1]]


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
    corpus: str
    paths_read: list[str] = field(default_factory=list)
    rg_invocations: list[dict[str, Any]] = field(default_factory=list)
    input_tokens: int = 0
    output_tokens: int = 0
    latency_ms: int = 0
    recall: float = 0.0
    recall_notes: list[str] = field(default_factory=list)
    page_cited: str | None = None
    anchor_fallback_used: bool = False


def run_b0(root: Path, task: dict[str, Any], counter) -> RunResult:
    t0 = time.perf_counter()
    paths: list[str] = []
    buf: list[str] = []
    rg_log: list[dict[str, Any]] = []
    hits: list[str] = []
    for pat in task["rg_patterns"]:
        found = run_rg(root, pat)
        rg_log.append({"pattern": pat, "path_count": len(found)})
        hits.extend(found)
    for rel in sorted(set(hits)):
        if rel.startswith("secrets/"):
            continue
        read_rel(root, rel, paths, buf)
        if len(paths) >= B0_CAP:
            break
    recall, notes = anchor_recall(root, paths, task["anchors"])
    fallback = False
    context = "\n".join(buf)
    tok_in = counter(context)
    elapsed = int((time.perf_counter() - t0) * 1000)
    return RunResult(
        task_id=task["id"],
        arm="B0",
        corpus=str(root),
        paths_read=paths,
        rg_invocations=rg_log,
        input_tokens=tok_in,
        output_tokens=0,
        latency_ms=elapsed,
        recall=recall,
        recall_notes=notes,
        anchor_fallback_used=fallback,
    )


def run_b1(
    root: Path,
    task: dict[str, Any],
    ai_root: Path,
    counter,
    require_page: bool = False,
) -> RunResult:
    t0 = time.perf_counter()
    paths: list[str] = []
    buf: list[str] = []
    read_rel(ai_root.parent, str(ai_root.relative_to(ai_root.parent) / "index.md"), paths, buf)
    pages = load_wiki_pages(ai_root)
    selected = rank_pages(task["query"], pages, top_k=2)
    cited = selected[0]["rel"] if selected else None
    for page in selected:
        read_rel(ai_root.parent, page["rel"], paths, buf)
        for sp in page["meta"].get("source_paths", []):
            read_rel(root, sp, paths, buf)
    recall, notes = anchor_recall(root, paths, task["anchors"])
    context = "\n".join(buf)
    tok_in = counter(context)
    elapsed = int((time.perf_counter() - t0) * 1000)
    if require_page and cited and cited not in paths:
        notes.append("page citation missing from paths_read")
        recall = 0.0
    return RunResult(
        task_id=task["id"],
        arm="B1",
        corpus=str(root),
        paths_read=paths,
        input_tokens=tok_in,
        latency_ms=elapsed,
        recall=recall,
        recall_notes=notes,
        page_cited=cited,
    )


def evidence_class_for_arm(arm: str) -> str:
    if arm == "B0":
        return "OFFICIAL_BASELINE"
    return "PROVISIONAL_CURATED_PACK"


def run_record(
    result: RunResult,
    meta: dict[str, Any],
    tree_sha: str,
    tok_label: str,
) -> dict[str, Any]:
    return {
        "experiment_id": "V22-BENCH-REAL",
        "evidence_class": evidence_class_for_arm(result.arm),
        "baseline_id": "v22-real-b0b1-2026-10-22",
        "run_id": f"V22R-{result.task_id}-{result.arm}-{hashlib.sha256((tree_sha+result.task_id+result.arm).encode()).hexdigest()[:12]}",
        "arm": result.arm,
        "task_id": result.task_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "tree_sha": tree_sha,
        "harness": HARNESS_VERSION,
        "tokenizer": tok_label,
        "model": {"id": "NOT_MEASURED", "note": "retrieval-only; no LLM"},
        "host_cache": "UNKNOWN",
        **meta,
        "metrics": asdict(result),
        "verifier": {"pass": result.recall >= 1.0, "recall": result.recall, "notes": result.recall_notes},
    }


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
    spec = json.loads(TASKS_FROZEN.read_text(encoding="utf-8"))
    spec["freeze_tree_sha"] = tree_sha
    all_runs: list[dict[str, Any]] = []

    for task in spec["tasks"]:
        for arm in ("B0", "B1"):
            if arm == "B0":
                res = run_b0(repo, task, counter)
                meta = {"corpus_label": spec["corpus_label"], "b1_mechanism": spec["b1_mechanism"]}
            else:
                res = run_b1(repo, task, KNOWLEDGE_PACK, counter)
                meta = {"corpus_label": spec["corpus_label"], "b1_mechanism": spec["b1_mechanism"]}
            rec = run_record(res, meta, tree_sha, tok_label)
            all_runs.append(rec)
            d = out_dir / "real" / task["id"] / arm
            d.mkdir(parents=True, exist_ok=True)
            (d / "run-01.json").write_text(json.dumps(rec, indent=2), encoding="utf-8")

    cont = spec["continuity"]
    cont_root = CONTINUITY_ROOT
    cont_ai = cont_root / ".ai"
    for sc in cont["scenarios"]:
        task = {
            "id": sc["id"],
            "query": sc["query"],
            "rg_patterns": sc["rg_patterns"],
            "anchors": sc["anchors"],
        }
        for arm in sc["arms"]:
            if arm == "B0":
                res = run_b0(cont_root, task, counter)
            else:
                res = run_b1(
                    cont_root,
                    task,
                    cont_ai,
                    counter,
                    require_page=sc.get("b1_requires_page_citation", False),
                )
            meta = {
                "corpus_label": cont["fixture"],
                "continuity": True,
                "scenario_number": sc["number"],
            }
            rec = run_record(res, meta, tree_sha, tok_label)
            all_runs.append(rec)
            d = out_dir / "continuity" / sc["id"] / arm
            d.mkdir(parents=True, exist_ok=True)
            (d / "run-01.json").write_text(json.dumps(rec, indent=2), encoding="utf-8")

    aggregates: dict[str, Any] = {}
    for r in all_runs:
        key = f"{r['task_id']}:{r['arm']}"
        m = r["metrics"]
        aggregates.setdefault(key, []).append(m)

    summary_aggs = {}
    for key, ms in aggregates.items():
        summary_aggs[key] = {
            "median_paths": median([len(x["paths_read"]) for x in ms]),
            "median_input_tokens": median([x["input_tokens"] for x in ms]),
            "median_latency_ms": median([x["latency_ms"] for x in ms]),
            "recall": ms[0]["recall"],
        }

    real_b1 = [summary_aggs[k] for k in summary_aggs if k.startswith("R") and k.endswith(":B1")]
    real_b0 = [summary_aggs[k] for k in summary_aggs if k.startswith("R") and k.endswith(":B0")]

    env = {
        "os": platform.platform(),
        "python": platform.python_version(),
        "harness": "real_corpus_harness.py",
        "tokenizer": tok_label,
        "source_revision": tree_sha,
        "wiki_ground_sh": spec["b1_mechanism"]["wiki_ground_sh"],
        "b1_mechanism": spec["b1_mechanism"]["primary"],
    }
    summary = {
        "experiment": "V22-BENCH-REAL",
        "classification_by_arm": {
            "B0": "OFFICIAL_BASELINE",
            "B1": "PROVISIONAL_CURATED_PACK",
        },
        "classification_note": (
            "B0: real rg+read on EvolveLoop monorepo. "
            "B1: curated bench pack with source_paths aligned to frozen anchors — "
            "circular recall; not product gates until V22-GOAL-005 path (see BENCHMARK-PLAN.md § B1→oficial)."
        ),
        "baseline_id": "v22-real-b0b1-2026-10-22",
        "mode": "REAL_CORPUS_RETRIEVAL",
        "freeze_tree_sha": tree_sha,
        "tasks_frozen": str(TASKS_FROZEN.relative_to(EXP_DIR)),
        "aggregates": summary_aggs,
        "rollups": {
            "real_repo_B0_median_paths": median([a["median_paths"] for a in real_b0]),
            "real_repo_B1_median_paths": median([a["median_paths"] for a in real_b1]),
            "real_repo_B0_median_tokens": median([a["median_input_tokens"] for a in real_b0]),
            "real_repo_B1_median_tokens": median([a["median_input_tokens"] for a in real_b1]),
        },
        "environment": env,
        "runs": [r["run_id"] for r in all_runs],
    }

    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "tasks-real-frozen.snapshot.json").write_text(json.dumps(spec, indent=2), encoding="utf-8")
    (out_dir / "environment.json").write_text(json.dumps(env, indent=2), encoding="utf-8")
    (out_dir / "all-runs.json").write_text(json.dumps(all_runs, indent=2), encoding="utf-8")
    (out_dir / "battery-summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return summary


if __name__ == "__main__":
    target = EXP_DIR / "raw" / "battery-real"
    if len(sys.argv) > 1:
        target = Path(sys.argv[1])
    s = run_battery(target)
    print(json.dumps({"verdict": "OK", "n_runs": len(s["runs"]), "rollups": s["rollups"]}, indent=2))
