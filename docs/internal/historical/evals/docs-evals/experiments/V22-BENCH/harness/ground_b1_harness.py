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
HARNESS_VERSION = "v22-ground-b1-harness-1.5.0"
B0_CAP = 45
# B0 scans monorepo source/docs only — never fixture wiki mirrors or auto-ingested vault pages.
RG_GLOBS = [
    "!node_modules",
    "!.git",
    "!dist",
    "!**/.venv",
    "!agent-setup/.venv",
    "!fixtures/evolveloop-wiki-vault/**",
    "!**/EvolveLoop/wiki/**",
    "!**/autogen-*",
    "!docs/internal/historical/evals/**",
    "!docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/raw/**",
]


def bench_max_paths() -> int:
    return int(os.environ.get("V22_BENCH_MAX_PATHS", str(B0_CAP)))


def bench_max_input_tokens() -> int:
    return int(os.environ.get("V22_BENCH_MAX_INPUT_TOKENS", "22000"))


def anchor_recall_mode() -> str:
    return os.environ.get("V22_ANCHOR_RECALL", "file").strip().lower()
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


def read_rel(
    root: Path,
    rel: str,
    paths: list[str],
    buf: list[str],
    counter: Callable[[str], int] | None = None,
    max_paths: int | None = None,
    max_tokens: int | None = None,
) -> bool:
    """Append file to context; return False if budget blocks the read."""
    if rel in paths:
        return True
    cap_paths = max_paths if max_paths is not None else bench_max_paths()
    cap_tokens = max_tokens if max_tokens is not None else bench_max_input_tokens()
    if len(paths) >= cap_paths:
        return False
    fp = root / rel
    if not fp.is_file():
        return False
    text = fp.read_text(encoding="utf-8", errors="replace")
    chunk = f"--- {rel} ---\n{text}\n"
    if counter is not None:
        projected = counter("\n".join(buf + [chunk]))
        if projected > cap_tokens:
            return False
    paths.append(rel)
    buf.append(chunk)
    return True


def append_excerpt(
    buf: list[str],
    excerpt: str,
    counter: Callable[[str], int],
    max_tokens: int,
) -> bool:
    if not excerpt:
        return True
    chunk = str(excerpt)
    if counter("\n".join(buf + [chunk])) > max_tokens:
        return False
    buf.append(chunk)
    return True


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
        line_ok = 1 <= line_no <= len(lines) and sub in lines[line_no - 1]
        file_ok = sub in "\n".join(lines)
        mode = anchor_recall_mode()
        if line_ok:
            hit += 1
        elif mode == "file" and file_ok:
            hit += 1
            notes.append(f"anchor line drift (file hit): {rel}:{line_no}")
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
    max_paths = bench_max_paths()
    max_tokens = bench_max_input_tokens()
    for pat in task["rg_patterns"]:
        hits.extend(run_rg(root, pat))
    for rel in sorted(set(hits)):
        if not read_rel(root, rel, paths, buf, counter, max_paths, max_tokens):
            break
    recall, notes = anchor_recall(root, paths, task["anchors"])
    tok_in = counter("\n".join(buf))
    elapsed = int((time.perf_counter() - t0) * 1000)
    return RunResult(task_id=task["id"], arm="B0", paths_read=paths, input_tokens=tok_in, latency_ms=elapsed, recall=recall, recall_notes=notes)


def _parse_source_paths_from_vault_page(vault_file: Path) -> list[str]:
    if not vault_file.is_file():
        return []
    text = vault_file.read_text(encoding="utf-8", errors="replace")
    if not text.startswith("---"):
        return []
    end = text.find("\n---", 3)
    if end == -1:
        return []
    fm = text[3:end]
    paths: list[str] = []
    in_block = False
    for line in fm.splitlines():
        if line.strip() == "source_paths:":
            in_block = True
            continue
        if in_block:
            if line.strip().startswith("- "):
                paths.append(line.strip()[2:].strip())
            elif line and not line.startswith(" "):
                in_block = False
    return paths


def _repo_paths_from_hit(hit: dict[str, Any], wiki_root: Path, repo: Path) -> list[str]:
    src = hit.get("source")
    vault_rel: str | None = None
    if isinstance(src, str):
        vault_rel = src
    elif isinstance(src, dict):
        vault_rel = str(src.get("file") or src.get("path") or "") or None
        if src.get("stale"):
            return []
    if not vault_rel:
        vault_rel = str(hit.get("path") or "")
    out: list[str] = []
    if vault_rel:
        vault_fp = wiki_root / vault_rel
        for sp in _parse_source_paths_from_vault_page(vault_fp):
            if (repo / sp).is_file():
                out.append(sp)
        # Fallback: path exists in monorepo as-is
        if (repo / vault_rel).is_file():
            out.append(vault_rel)
    return sorted(set(out))


def _load_query_glossary(env: dict[str, str]) -> dict[str, Any]:
    wiki = Path(env["WIKI_ROOT"])
    gpath = wiki / ".data" / "evolveloop-query-glossary.json"
    if not gpath.is_file():
        return {"pt_to_en": {}}
    try:
        return json.loads(gpath.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {"pt_to_en": {}}


def _expand_b1_query(query: str, env: dict[str, str]) -> str:
    scripts = repo_root() / "docs/architecture/v2.2/scripts"
    if str(scripts) not in sys.path:
        sys.path.insert(0, str(scripts))
    from evolveloop_recall_support import expand_query

    glossary = _load_query_glossary(env)
    return expand_query(query, glossary)


def _hybrid_lexical_paths(root: Path, query: str, env: dict[str, str]) -> list[str]:
    if os.environ.get("V22_B1_HYBRID_LEXICAL", "1").strip() in ("0", "false", "no"):
        return []
    scripts = repo_root() / "docs/architecture/v2.2/scripts"
    if str(scripts) not in sys.path:
        sys.path.insert(0, str(scripts))
    from evolveloop_recall_support import lexical_rg_patterns

    glossary = _load_query_glossary(env)
    patterns = lexical_rg_patterns(query, glossary, max_patterns=4)
    hits: list[str] = []
    for pat in patterns:
        hits.extend(run_rg(root, pat))
    return sorted(set(hits))[:20]


def run_ground_json(query: str, env: dict[str, str]) -> dict[str, Any]:
    vault = env["WIKI_ROOT"]
    py = env.get("WIKI_PYTHON", f"{vault}/.venv/bin/python")
    top_k = os.environ.get("V22_B1_TOP_K", "16")
    sub_env = env.copy()
    if os.environ.get("V22_B1_RETRIEVAL", "hybrid").strip().lower() in (
        "bm25",
        "bm25_degraded",
        "degraded",
    ):
        sub_env["OLLAMA_URL"] = "http://127.0.0.1:1"
    raw = subprocess.run(
        [py, "-m", "gaabwiki", "search", query, "--json", "--top-k", top_k],
        capture_output=True,
        text=True,
        env=sub_env,
        check=False,
    )
    if raw.returncode != 0:
        return {"status": "error", "stderr": raw.stderr, "exit": raw.returncode}
    return json.loads(raw.stdout or "{}")


def _iter_search_hits(data: dict[str, Any], limit: int = 24) -> list[dict[str, Any]]:
    """Real gaabwiki JSON exposes selected + stage lists; union for provenance paths."""
    out: list[dict[str, Any]] = []
    seen: set[str] = set()
    for key in ("selected", "hybrid", "bm25", "results"):
        for hit in data.get(key) or []:
            if not isinstance(hit, dict):
                continue
            cid = str(hit.get("chunk_id") or hit.get("source") or len(out))
            if cid in seen:
                continue
            seen.add(cid)
            out.append(hit)
            if len(out) >= limit:
                return out
    return out


def run_b1_ground(root: Path, task: dict[str, Any], counter, env: dict[str, str]) -> RunResult:
    t0 = time.perf_counter()
    paths: list[str] = []
    buf: list[str] = []
    wiki_root = Path(env["WIKI_ROOT"])
    # B1: task.query only (+ optional corpus glossary expansion). Never task.rg_patterns.
    search_queries = [task["query"]]
    expanded = _expand_b1_query(task["query"], env)
    if expanded != task["query"]:
        search_queries.append(expanded)
    max_paths = bench_max_paths()
    max_tokens = bench_max_input_tokens()
    stale = 0
    seen_hit: set[str] = set()
    budget_exhausted = False
    for q in search_queries:
        if budget_exhausted:
            break
        data = run_ground_json(q, env)
        hits = _iter_search_hits(data)
        for hit in hits:
            cid = str(hit.get("chunk_id") or hit.get("source") or "")
            if cid in seen_hit:
                continue
            seen_hit.add(cid)
            src = hit.get("source")
            if isinstance(src, dict) and src.get("stale"):
                stale += 1
                continue
            for rel in _repo_paths_from_hit(hit, wiki_root, root):
                if not read_rel(root, rel, paths, buf, counter, max_paths, max_tokens):
                    budget_exhausted = True
                    break
            if budget_exhausted:
                break
            excerpt = (
                hit.get("content")
                or hit.get("text")
                or hit.get("preview")
                or ""
            )
            if excerpt and not append_excerpt(buf, str(excerpt), counter, max_tokens):
                budget_exhausted = True
                break
    if not budget_exhausted:
        for rel in _hybrid_lexical_paths(root, task["query"], env):
            if not read_rel(root, rel, paths, buf, counter, max_paths, max_tokens):
                break
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


def resolve_b1_class_and_env(repo: Path) -> tuple[str, dict[str, str], dict[str, Any]]:
    """Official B1 only when real karpathyWiki clone + sha match; else fixture vault."""
    env = os.environ.copy()
    engine = os.environ.get("V22_WIKI_ENGINE", "auto").lower()
    karpathy_dir = Path(os.environ.get("KARPATHY_WIKI_DIR", "/opt/karpathyWiki"))
    expected_sha = os.environ.get("KARPATHY_WIKI_SHA", "cd3cf08")
    fixture = repo / "fixtures" / "evolveloop-wiki-vault"
    meta: dict[str, Any] = {
        "engine_requested": engine,
        "karpathy_wiki_dir": str(karpathy_dir),
        "karpathy_wiki_sha_expected": expected_sha,
    }

    status_path = (
        repo
        / "docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/raw/battery-held-out-real-engine/OFFICIAL-STATUS.json"
    )
    motor_ready = (karpathy_dir / "gaabwiki" / "cli.py").is_file()
    use_official = engine in ("official", "karpathywiki", "real")
    if engine == "auto":
        use_official = motor_ready

    if use_official and not motor_ready:
        meta["official_blocked"] = "motor_missing"
        use_official = False
    elif use_official and (karpathy_dir / ".git").is_dir():
        try:
            head = subprocess.check_output(
                ["git", "rev-parse", "HEAD"], cwd=karpathy_dir, text=True
            ).strip()
            meta["karpathy_wiki_sha_actual"] = head
            if not head.startswith(expected_sha):
                meta["official_blocked"] = "sha_mismatch"
                use_official = False
        except subprocess.CalledProcessError as exc:
            meta["official_blocked"] = f"git_head_error:{exc.returncode}"
            use_official = False
    elif use_official and status_path.is_file():
        try:
            st = json.loads(status_path.read_text(encoding="utf-8"))
            meta["motor_origin"] = st.get("motor_origin")
            meta["tarball_sha256"] = st.get("karpathywiki_tarball_sha256")
            if st.get("status") != "READY":
                meta["official_blocked"] = f"status_{st.get('status')}"
                use_official = False
        except json.JSONDecodeError:
            meta["official_blocked"] = "invalid_official_status"
            use_official = False
    elif use_official:
        meta["official_blocked"] = "no_git_and_no_status"
        use_official = False

    if use_official:
        vault = karpathy_dir
        py = Path(os.environ.get("WIKI_PYTHON", karpathy_dir / ".venv" / "bin" / "python"))
        b1_class = "OFFICIAL_WIKI_GROUND"
        meta["wiki_engine"] = "karpathyWiki"
    else:
        vault = fixture
        py = Path(os.environ.get("WIKI_PYTHON", fixture / ".venv" / "bin" / "python"))
        b1_class = "FIXTURE_WIKI_GROUND"
        meta["wiki_engine"] = "fixtures/evolveloop-wiki-vault"

    env["WIKI_ROOT"] = str(vault)
    env["KNOWLEDGE_PATH"] = str(vault)
    env["AGENTS_ROOT"] = str(repo)
    env["EVOLVELOOP_MONOREPO_ROOT"] = str(repo)
    env["WIKI_PYTHON"] = str(py)
    env["CORPUS_YAML"] = str(
        repo / "docs/architecture/v2.2/scripts/corpus-evolveloop-official.yaml"
    )
    env["CORPUS_SET"] = "evolveloop"
    meta["wiki_root"] = str(vault)
    meta["wiki_python"] = str(py)
    return b1_class, env, meta


def filter_tasks(tasks: list[dict[str, Any]], only: str | None) -> list[dict[str, Any]]:
    if not only:
        return tasks
    if only.upper() == "H07-H18":
        allowed = {f"H{n:02d}" for n in range(7, 19)}
        return [t for t in tasks if t["id"] in allowed]
    if "-" in only and only[0] == "H":
        start, end = only.split("-", 1)
        ids = []
        for tid in (start, end):
            if tid.startswith("H") and tid[1:].isdigit():
                ids.append(int(tid[1:]))
        if len(ids) == 2:
            lo, hi = sorted(ids)
            allowed = {f"H{n:02d}" for n in range(lo, hi + 1)}
            return [t for t in tasks if t["id"] in allowed]
    return [t for t in tasks if t["id"] == only]


def median(vals: list[float]) -> float:
    if not vals:
        return 0.0
    s = sorted(vals)
    n = len(s)
    m = n // 2
    return float(s[m]) if n % 2 else (s[m - 1] + s[m]) / 2.0


def run_battery(out_dir: Path, task_filter: str | None = None) -> dict[str, Any]:
    tok_label, counter = load_tokenizer()
    repo = repo_root()
    tree_sha = git_sha(repo)
    spec = json.loads(TASKS_HELD.read_text(encoding="utf-8"))
    spec["freeze_tree_sha"] = tree_sha
    b1_class, env, engine_meta = resolve_b1_class_and_env(repo)
    vault = Path(engine_meta["wiki_root"])
    tasks = filter_tasks(spec["tasks"], task_filter)

    all_runs: list[dict[str, Any]] = []
    for task in tasks:
        for arm in ("B0", "B1"):
            if arm == "B0":
                res = run_b0(repo, task, counter)
            else:
                res = run_b1_ground(repo, task, counter, env)
            rec = {
                "experiment_id": "V22-BENCH-HELD-OUT",
                "evidence_class": "OFFICIAL_BASELINE" if arm == "B0" else b1_class,
                "baseline_id": "v22-held-out-b0b1-ground-2026-10-22-real-engine",
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
            "B1": b1_class,
        },
        "baseline_id": "v22-held-out-b0b1-ground-2026-10-22-real-engine",
        "harness_notes": {
            "b0_corpus_rg_globs": RG_GLOBS,
            "anchor_recall_mode": anchor_recall_mode(),
            "bench_max_paths": bench_max_paths(),
            "bench_max_input_tokens": bench_max_input_tokens(),
            "b1_query": "task.query + corpus glossary expansion (rg_patterns reserved for B0)",
            "b1_hybrid_lexical": os.environ.get("V22_B1_HYBRID_LEXICAL", "1"),
            "b1_top_k": os.environ.get("V22_B1_TOP_K", "16"),
            "wiki_engine": engine_meta,
        },
        "task_filter": task_filter,
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
    import argparse

    ap = argparse.ArgumentParser()
    ap.add_argument(
        "out_dir",
        nargs="?",
        default=str(EXP_DIR / "raw" / "battery-held-out"),
    )
    ap.add_argument(
        "--tasks",
        default=os.environ.get("V22_HELD_OUT_TASKS"),
        help="e.g. H07-H18 or H13",
    )
    args = ap.parse_args()
    s = run_battery(Path(args.out_dir), task_filter=args.tasks)
    blocked = s.get("harness_notes", {}).get("wiki_engine", {}).get("official_blocked")
    verdict = "BLOCKED" if blocked else "OK"
    print(json.dumps({"verdict": verdict, "blocked": blocked, "rollups": s["rollups"]}, indent=2))
