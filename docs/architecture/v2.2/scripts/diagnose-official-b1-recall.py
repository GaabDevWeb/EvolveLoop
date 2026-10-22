#!/usr/bin/env python3
"""Per-task B1 recall diagnosis (ingest + BM25 rank). Uses held-out anchors for eval only."""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

_SCRIPTS = Path(__file__).resolve().parent
if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))

from evolveloop_recall_support import expand_query, load_glossary, repo_root

EXP_DIR = (
    repo_root(None)
    / "docs/internal/historical/evals/docs-evals/experiments/V22-BENCH"
)
TASKS_PATH = EXP_DIR / "tasks-held-out-frozen.json"


def parse_source_paths(vault_page: Path) -> list[str]:
    if not vault_page.is_file():
        return []
    text = vault_page.read_text(encoding="utf-8", errors="replace")
    if not text.startswith("---"):
        return []
    end = text.find("\n---", 3)
    if end == -1:
        return []
    paths: list[str] = []
    in_block = False
    for line in text[3:end].splitlines():
        if line.strip() == "source_paths:":
            in_block = True
            continue
        if in_block:
            if line.strip().startswith("- "):
                paths.append(line.strip()[2:].strip())
            elif line and not line.startswith(" "):
                in_block = False
    return paths


def load_manifest(wiki_root: Path) -> dict[str, str]:
    """repo rel path -> vault page name"""
    mp: dict[str, str] = {}
    manifest = wiki_root / ".data" / "evolveloop-autogen-manifest.json"
    if manifest.is_file():
        data = json.loads(manifest.read_text(encoding="utf-8"))
        for row in data.get("files") or []:
            mp[row["rel"]] = row["page"]
    else:
        pages = wiki_root / "EvolveLoop" / "wiki"
        for p in pages.glob("autogen-*"):
            for sp in parse_source_paths(p):
                mp[sp] = p.name
    return mp


def bm25_rank_for_anchor(
    wiki_root: Path,
    query: str,
    anchor_path: str,
    top_k_scan: int = 200,
) -> tuple[int | None, str]:
    os.environ.setdefault("KNOWLEDGE_PATH", str(wiki_root))
    os.environ.setdefault("WIKI_ROOT", str(wiki_root))
    from gaabwiki.config import get_settings, reset_settings_cache
    from gaabwiki.storage.bm25_index import BM25Index

    reset_settings_cache()
    settings = get_settings().resolve_paths()
    bm25 = BM25Index(settings.bm25_path)
    bm25.load()
    hits = bm25.search(query, top_k=top_k_scan)
    wiki_pages = wiki_root / "EvolveLoop" / "wiki"
    for rank, hit in enumerate(hits, start=1):
        src = hit.source.file if hit.source else ""
        if not src:
            continue
        vault_fp = wiki_root / src if not Path(src).is_absolute() else Path(src)
        for sp in parse_source_paths(vault_fp):
            if sp == anchor_path:
                return rank, src
        if anchor_path in (hit.content or ""):
            return rank, src
        page = wiki_pages / Path(src).name
        if page.is_file() and anchor_path in page.read_text(encoding="utf-8", errors="replace"):
            return rank, src
    return None, ""


def classify_cause(
    ingested: bool,
    rank: int | None,
    top_k: int,
    query: str,
) -> str:
    if not ingested:
        return "not_ingested"
    if rank is None:
        if re.search(r"[áàâãéêíóôõúç]", query, re.I) and not re.search(
            r"\bADR-\d{4}\b|[A-Z][a-z]+[A-Z]", query
        ):
            return "language_pt_vs_en_corpus"
        return "chunking_or_no_bm25_signal"
    if rank > top_k:
        return f"top_k_below_rank_{rank}"
    return "in_top_k"


def filter_tasks(tasks: list[dict], spec: str) -> list[dict]:
    if not spec:
        return tasks
    if spec.upper() == "H07-H18":
        allowed = {f"H{n:02d}" for n in range(7, 19)}
        return [t for t in tasks if t["id"] in allowed]
    if "-" in spec and spec[0] == "H":
        a, b = spec.split("-", 1)
        if a[1:].isdigit() and b[1:].isdigit():
            lo, hi = sorted((int(a[1:]), int(b[1:])))
            allowed = {f"H{n:02d}" for n in range(lo, hi + 1)}
            return [t for t in tasks if t["id"] in allowed]
    return [t for t in tasks if t["id"] == spec]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--wiki-root", default=os.environ.get("KARPATHY_WIKI_DIR", "/opt/karpathyWiki"))
    ap.add_argument("--tasks", default="H07-H18")
    ap.add_argument("--top-k", type=int, default=12)
    ap.add_argument(
        "-o",
        "--output",
        default=str(EXP_DIR / "raw" / "battery-held-out-real-engine" / "recall-diagnosis.json"),
    )
    args = ap.parse_args()
    wiki = Path(args.wiki_root).resolve()
    repo = repo_root(None)
    spec = json.loads(TASKS_PATH.read_text(encoding="utf-8"))
    tasks = filter_tasks(spec["tasks"], args.tasks)
    manifest = load_manifest(wiki)
    glossary = load_glossary(wiki / ".data" / "evolveloop-query-glossary.json")

    rows: list[dict[str, Any]] = []
    for task in tasks:
        anchor = task["anchors"][0]
        rel = anchor["path"]
        ingested = rel in manifest
        raw_q = task["query"]
        exp_q = expand_query(raw_q, glossary)
        rank_raw, src_raw = bm25_rank_for_anchor(wiki, raw_q, rel) if ingested else (None, "")
        rank_exp, src_exp = (
            bm25_rank_for_anchor(wiki, exp_q, rel) if ingested else (None, "")
        )
        rank = rank_exp if rank_exp is not None else rank_raw
        cause = classify_cause(ingested, rank, args.top_k, raw_q)
        rows.append(
            {
                "task_id": task["id"],
                "anchor_path": rel,
                "ingested": ingested,
                "vault_page": manifest.get(rel),
                "bm25_rank_raw_query": rank_raw,
                "bm25_rank_expanded_query": rank_exp,
                "bm25_rank_reported": rank,
                "hit_source_path": src_exp or src_raw,
                "cause": cause,
                "query_lang_hint": "pt" if re.search(r"[áàâãéêíóôõúç]", raw_q, re.I) else "mixed",
            }
        )

    out = {
        "schema": "v22-b1-recall-diagnosis-v1",
        "wiki_root": str(wiki),
        "tree_sha": subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=repo, text=True
        ).strip(),
        "task_filter": args.tasks,
        "top_k": args.top_k,
        "rows": rows,
    }
    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({"ok": True, "output": str(out_path), "tasks": len(rows)}, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
