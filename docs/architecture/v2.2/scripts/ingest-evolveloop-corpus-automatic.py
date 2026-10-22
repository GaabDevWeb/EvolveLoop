#!/usr/bin/env python3
"""Automated EvolveLoop → wiki vault pages (no hand-written summaries, no V22-BENCH)."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

_SCRIPTS = Path(__file__).resolve().parent
if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))

from evolveloop_recall_support import (
    build_glossary,
    build_index_preamble,
    collect_corpus_files,
    repo_root,
    should_skip,
)

MAX_BODY_CHARS = 12_000


def slugify(rel: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9._-]+", "-", rel).strip("-")
    return s[:180] or "file"


def keywords_from_text(text: str) -> list[str]:
    tokens = re.findall(r"[A-Za-z_][A-Za-z0-9_./-]{2,}", text[:4000])
    seen: set[str] = set()
    out: list[str] = []
    for t in tokens:
        low = t.lower()
        if low in seen:
            continue
        seen.add(low)
        out.append(t)
        if len(out) >= 40:
            break
    return out


def sectionize_body(rel: str, body: str) -> str:
    """Prefer chunk boundaries at markdown headings (motor chunker sees ## lines)."""
    if not rel.endswith(".md"):
        return body[:MAX_BODY_CHARS]
    parts = re.split(r"(?=^#{1,3}\s+)", body, flags=re.MULTILINE)
    if len(parts) <= 1:
        return body[:MAX_BODY_CHARS]
    out: list[str] = []
    total = 0
    for part in parts:
        if total + len(part) > MAX_BODY_CHARS:
            break
        out.append(part)
        total += len(part)
    return "".join(out) if out else body[:MAX_BODY_CHARS]


def write_page(dest: Path, rel: str, body: str) -> None:
    title = rel.split("/")[-1]
    section_body = sectionize_body(rel, body)
    preamble = build_index_preamble(rel, section_body)
    kw = keywords_from_text(preamble + section_body)
    fm = [
        "---",
        f"title: {title}",
        "status: atual",
        f"keywords: {' '.join(kw[:25])}",
        "source_paths:",
        f"  - {rel}",
        "---",
        "",
        f"# Auto-ingested: {rel}",
        "",
        preamble,
        section_body,
        "",
    ]
    dest.write_text("\n".join(fm), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", default=None)
    parser.add_argument(
        "--wiki-root",
        required=True,
        help="WIKI_ROOT (karpathyWiki clone or portable vault)",
    )
    parser.add_argument(
        "--layout",
        choices=("fixture", "karpathy"),
        default="karpathy",
        help="fixture=projects/<name>/pages; karpathy=EvolveLoop/wiki/ (real motor)",
    )
    parser.add_argument(
        "--project",
        default="evolveloop",
        help="fixture layout: projects/<name>/pages",
    )
    args = parser.parse_args()
    repo = repo_root(args.repo)
    wiki = Path(args.wiki_root).resolve()
    if args.layout == "karpathy":
        pages_dir = wiki / "EvolveLoop" / "wiki"
    else:
        pages_dir = wiki / "projects" / args.project / "pages"
    pages_dir.mkdir(parents=True, exist_ok=True)

    # Clean prior autogen only
    for old in pages_dir.glob("autogen-*"):
        if old.is_file():
            old.unlink()

    files = collect_corpus_files(repo)
    manifest: list[dict[str, str]] = []
    for fp in files:
        rel = fp.relative_to(repo).as_posix()
        body = fp.read_text(encoding="utf-8", errors="replace")
        name = f"autogen-{slugify(rel)}.md"
        write_page(pages_dir / name, rel, body)
        manifest.append(
            {
                "rel": rel,
                "page": name,
                "sha256": hashlib.sha256(body.encode("utf-8", errors="replace")).hexdigest(),
            }
        )

    data_dir = wiki / ".data"
    data_dir.mkdir(parents=True, exist_ok=True)
    log_path = data_dir / "evolveloop-autogen-manifest.json"
    log_path.write_text(
        json.dumps(
            {
                "ok": True,
                "repo": str(repo),
                "pages_dir": str(pages_dir),
                "file_count": len(manifest),
                "bench_block_excluded": "docs/.../V22-BENCH",
                "files": manifest,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    glossary_path = data_dir / "evolveloop-query-glossary.json"
    glossary_path.write_text(
        json.dumps(build_glossary(repo), indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({"ok": True, "ingested": len(manifest), "pages_dir": str(pages_dir)}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
