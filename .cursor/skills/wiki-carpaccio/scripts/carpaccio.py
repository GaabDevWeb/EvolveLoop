#!/usr/bin/env python3
"""Carpaccio .ai/ workflows — init, query, update, lint (stdlib only)."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any


def ai_root(repo: Path) -> Path:
    return repo / ".ai"


def manifest_path(ai: Path) -> Path:
    return ai / "manifest.yaml"


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


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


def dump_frontmatter(meta: dict[str, Any], body: str) -> str:
    lines = ["---"]
    for key in ("title", "status", "keywords"):
        if key in meta:
            val = meta[key]
            if isinstance(val, list):
                lines.append(f"{key}: {' '.join(val)}")
            else:
                lines.append(f"{key}: {val}")
    if meta.get("source_paths"):
        lines.append("source_paths:")
        for sp in meta["source_paths"]:
            lines.append(f"  - {sp}")
    lines.append("---")
    lines.append(body.lstrip("\n"))
    return "\n".join(lines) + "\n"


def cmd_init(repo: Path) -> None:
    ai = ai_root(repo)
    (ai / "pages").mkdir(parents=True, exist_ok=True)
    (ai / "raw").mkdir(exist_ok=True)
    idx = ai / "index.md"
    if not idx.exists():
        idx.write_text("# Project index\n\nSee pages/\n", encoding="utf-8")
    log = ai / "log.md"
    if not log.exists():
        log.write_text("# Session log\n", encoding="utf-8")
    mp = manifest_path(ai)
    if not mp.exists():
        mp.write_text("version: 1\nsources: {}\n", encoding="utf-8")
    print(json.dumps({"ok": True, "ai": str(ai)}))


def load_manifest(ai: Path) -> dict[str, Any]:
    mp = manifest_path(ai)
    if not mp.exists():
        return {"version": 1, "sources": {}}
    text = mp.read_text(encoding="utf-8")
    sources: dict[str, str] = {}
    for line in text.splitlines():
        m = re.match(r"^\s+(\S+):\s+([a-f0-9]{64})$", line)
        if m:
            sources[m.group(1)] = m.group(2)
    return {"version": 1, "sources": sources, "raw": text}


def save_manifest(ai: Path, sources: dict[str, str]) -> None:
    lines = ["version: 1", "sources:"]
    for k in sorted(sources.keys()):
        lines.append(f"  {k}: {sources[k]}")
    manifest_path(ai).write_text("\n".join(lines) + "\n", encoding="utf-8")


def cmd_update(repo: Path, page: str | None) -> None:
    ai = ai_root(repo)
    pages_dir = ai / "pages"
    targets = [pages_dir / page] if page else sorted(pages_dir.glob("*.md"))
    sources = load_manifest(ai)["sources"]
    updated = 0
    for p in targets:
        if not p.is_file():
            continue
        meta, body = parse_frontmatter(p.read_text(encoding="utf-8"))
        for sp in meta.get("source_paths") or []:
            fp = repo / sp
            if fp.is_file():
                sources[sp] = sha256_file(fp)
        meta["status"] = meta.get("status") or "atual"
        p.write_text(dump_frontmatter(meta, body), encoding="utf-8")
        updated += 1
    save_manifest(ai, sources)
    print(json.dumps({"ok": True, "pages_updated": updated}))


def cmd_lint(repo: Path) -> None:
    ai = ai_root(repo)
    sources = load_manifest(ai)["sources"]
    stale_pages: list[str] = []
    for p in sorted((ai / "pages").glob("*.md")):
        meta, _ = parse_frontmatter(p.read_text(encoding="utf-8"))
        for sp in meta.get("source_paths") or []:
            fp = repo / sp
            if not fp.is_file():
                meta["status"] = "obsoleto"
                stale_pages.append(str(p.relative_to(repo)))
                break
            live = sha256_file(fp)
            recorded = sources.get(sp)
            if recorded and recorded != live:
                meta["status"] = "obsoleto"
                stale_pages.append(str(p.relative_to(repo)))
                _, body = parse_frontmatter(p.read_text(encoding="utf-8"))
                p.write_text(dump_frontmatter(meta, body), encoding="utf-8")
                break
    print(json.dumps({"ok": True, "stale_pages": stale_pages}))


def cmd_query(repo: Path, query: str) -> None:
    ai = ai_root(repo)
    qtok = set(re.findall(r"[a-zA-Z0-9_./-]+", query.lower()))
    best: tuple[float, Path, dict[str, Any]] | None = None
    for p in sorted((ai / "pages").glob("*.md")):
        text = p.read_text(encoding="utf-8")
        meta, body = parse_frontmatter(text)
        if meta.get("status") == "obsoleto":
            continue
        kws = {str(k).lower() for k in meta.get("keywords", [])}
        score = len(qtok & kws) * 2 + len(qtok & set(re.findall(r"[a-zA-Z0-9_./-]+", body.lower())))
        if best is None or score > best[0]:
            best = (score, p, meta)
    if not best:
        print(json.dumps({"status": "no_hits"}))
        return
    score, path, meta = best
    print(
        json.dumps(
            {
                "status": "ok",
                "page": str(path.relative_to(repo)),
                "score": score,
                "source_paths": meta.get("source_paths", []),
            }
        )
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", default=".", help="Repository root")
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("init").set_defaults(func=lambda a: cmd_init(Path(a.repo).resolve()))
    p_q = sub.add_parser("query")
    p_q.add_argument("query")
    p_q.set_defaults(func=lambda a: cmd_query(Path(a.repo).resolve(), a.query))
    p_u = sub.add_parser("update")
    p_u.add_argument("--page", default=None)
    p_u.add_argument("--all", action="store_true")
    p_u.set_defaults(func=lambda a: cmd_update(Path(a.repo).resolve(), a.page))
    sub.add_parser("lint").set_defaults(func=lambda a: cmd_lint(Path(a.repo).resolve()))
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
