#!/usr/bin/env python3
"""Automated EvolveLoop → wiki vault pages (no hand-written summaries, no V22-BENCH)."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

BENCH_BLOCK = "docs/internal/historical/evals/docs-evals/experiments/V22-BENCH"
CORPUS_ROOTS = (
    "docs",
    "orchestrator/src",
    "profiles",
    ".cursor/skills",
)
ALLOWED_SUFFIXES = {
    ".md",
    ".yaml",
    ".yml",
    ".ts",
    ".tsx",
    ".py",
    ".json",
    ".sh",
}
SKIP_DIR_NAMES = {
    "node_modules",
    ".git",
    "dist",
    ".venv",
    "__pycache__",
    "raw",
}
MAX_BODY_CHARS = 12_000
MAX_FILES = 2000


def repo_root(explicit: str | None) -> Path:
    if explicit:
        return Path(explicit).resolve()
    import subprocess

    out = subprocess.check_output(
        ["git", "rev-parse", "--show-toplevel"],
        text=True,
    )
    return Path(out.strip()).resolve()


def should_skip(path: Path, repo: Path) -> bool:
    rel = path.relative_to(repo).as_posix()
    if BENCH_BLOCK in rel or "/V22-BENCH/" in rel:
        return True
    if "docs/internal/historical/evals" in rel:
        return True
    parts = set(path.parts)
    if parts & SKIP_DIR_NAMES:
        return True
    return path.suffix.lower() not in ALLOWED_SUFFIXES


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


def write_page(dest: Path, rel: str, body: str) -> None:
    title = rel.split("/")[-1]
    kw = keywords_from_text(body)
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
        body[:MAX_BODY_CHARS],
        "",
    ]
    dest.write_text("\n".join(fm), encoding="utf-8")


def collect_files(repo: Path) -> list[Path]:
    found: list[Path] = []
    for root_name in CORPUS_ROOTS:
        base = repo / root_name
        if not base.exists():
            continue
        for p in sorted(base.rglob("*")):
            if not p.is_file():
                continue
            if should_skip(p, repo):
                continue
            found.append(p)
            if len(found) >= MAX_FILES:
                return found
    return found


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

    files = collect_files(repo)
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

    log_path = wiki / ".data" / "evolveloop-autogen-manifest.json"
    log_path.parent.mkdir(parents=True, exist_ok=True)
    log_path.write_text(
        json.dumps(
            {
                "ok": True,
                "repo": str(repo),
                "pages_dir": str(pages_dir),
                "file_count": len(manifest),
                "bench_block_excluded": BENCH_BLOCK,
                "files": manifest[:50],
                "truncated_list": len(manifest) > 50,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(json.dumps({"ok": True, "ingested": len(manifest), "pages_dir": str(pages_dir)}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
