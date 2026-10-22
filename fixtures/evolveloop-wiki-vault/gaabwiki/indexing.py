from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .manifest import load_manifest, save_manifest, sha256_file, source_hash


def _parse_frontmatter(md: str) -> tuple[dict[str, Any], str]:
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


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[\w./-]+", text.lower(), flags=re.UNICODE)


@dataclass
class Chunk:
    chunk_id: str
    vault_path: str
    repo_sources: list[str]
    line: int
    text: str
    tokens: list[str]
    source_hashes: dict[str, str]

    def to_dict(self) -> dict[str, Any]:
        return {
            "chunk_id": self.chunk_id,
            "vault_path": self.vault_path,
            "repo_sources": self.repo_sources,
            "line": self.line,
            "text": self.text,
            "source_hashes": self.source_hashes,
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> Chunk:
        return cls(
            chunk_id=str(d["chunk_id"]),
            vault_path=str(d["vault_path"]),
            repo_sources=list(d.get("repo_sources") or []),
            line=int(d.get("line") or 1),
            text=str(d.get("text") or ""),
            tokens=_tokenize(str(d.get("text") or "")),
            source_hashes=dict(d.get("source_hashes") or {}),
        )


def _discover_pages(vault_root: Path) -> list[Path]:
    pages: list[Path] = []
    for base in (vault_root / "projects", vault_root / "packs"):
        if not base.is_dir():
            continue
        pages.extend(sorted(base.rglob("*.md")))
    return pages


def _build_chunks_for_page(
    page_path: Path,
    vault_root: Path,
    monorepo_root: Path | None,
) -> list[Chunk]:
    rel_vault = str(page_path.relative_to(vault_root))
    md = page_path.read_text(encoding="utf-8")
    meta, body = _parse_frontmatter(md)
    sources = list(meta.get("source_paths") or [])
    hashes: dict[str, str] = {}
    primary_line = 1
    if sources and monorepo_root:
        first = monorepo_root / sources[0]
        if first.is_file():
            hashes[sources[0]] = sha256_file(first)
            lines = first.read_text(encoding="utf-8", errors="replace").splitlines()
            for i, ln in enumerate(lines, 1):
                if ln.strip():
                    primary_line = i
                    break
    digest = hashlib.sha256((rel_vault + body).encode()).hexdigest()[:16]
    chunk_id = f"{rel_vault}#{digest}"
    return [
        Chunk(
            chunk_id=chunk_id,
            vault_path=rel_vault,
            repo_sources=sources,
            line=primary_line,
            text=body.strip()[:4000],
            tokens=_tokenize(
                body
                + " "
                + " ".join(sources)
                + " "
                + " ".join(str(k) for k in meta.get("keywords", []))
            ),
            source_hashes=hashes,
        )
    ]


def rebuild(
    vault_root: Path,
    monorepo_root: Path | None,
    incremental: bool = False,
) -> dict[str, Any]:
    manifest = load_manifest(vault_root)
    old_chunks = {c["chunk_id"]: c for c in manifest.get("chunks", [])}
    new_chunks: list[dict[str, Any]] = []
    sources_meta: dict[str, Any] = dict(manifest.get("sources") or {})

    for page in _discover_pages(vault_root):
        for ch in _build_chunks_for_page(page, vault_root, monorepo_root):
            if incremental and ch.chunk_id in old_chunks:
                old = old_chunks[ch.chunk_id]
                if old.get("text") == ch.text and old.get("source_hashes") == ch.source_hashes:
                    new_chunks.append(old)
                    continue
            new_chunks.append(ch.to_dict())
            for sp, h in ch.source_hashes.items():
                sources_meta[sp] = {"sha256": h, "indexed_at": manifest.get("indexed_at")}

    if monorepo_root:
        for sp in list(sources_meta.keys()):
            h = source_hash(vault_root, sp, monorepo_root)
            if h:
                sources_meta[sp] = {"sha256": h}

    out = {
        "version": 1,
        "vault_root": str(vault_root),
        "monorepo_root": str(monorepo_root) if monorepo_root else None,
        "chunks": new_chunks,
        "sources": sources_meta,
        "corpus_size": len(new_chunks),
    }
    save_manifest(vault_root, out)
    return out


def search(
    vault_root: Path,
    query: str,
    top_k: int = 8,
    monorepo_root: Path | None = None,
    projeto: str | None = None,
) -> dict[str, Any]:
    manifest = load_manifest(vault_root)
    chunks = [Chunk.from_dict(c) for c in manifest.get("chunks", [])]
    if projeto:
        chunks = [c for c in chunks if projeto in c.vault_path]
    if not chunks:
        return {
            "status": "empty_corpus",
            "confidence": "low",
            "allow_generation": False,
            "retrieval_method": "bm25",
            "corpus_size": 0,
            "selected": [],
        }

    qtok = set(_tokenize(query))
    scored: list[tuple[float, Chunk]] = []
    for ch in chunks:
        score = len(qtok & set(ch.tokens))
        if score > 0:
            scored.append((float(score), ch))
    scored.sort(key=lambda x: (-x[0], x[1].vault_path))
    selected_raw = [c for _, c in scored[:top_k]]
    if not selected_raw and chunks:
        selected_raw = [chunks[0]]

    selected: list[dict[str, Any]] = []
    for ch in selected_raw:
        stale = False
        stale_reason: str | None = None
        primary = ch.repo_sources[0] if ch.repo_sources else ch.vault_path
        indexed_hash = ch.source_hashes.get(primary)
        live_hash = None
        if monorepo_root and primary in ch.source_hashes:
            live_hash = source_hash(vault_root, primary, monorepo_root)
            if live_hash and indexed_hash and live_hash != indexed_hash:
                stale = True
                stale_reason = "source_hash_mismatch"
        hit = {
            "score": len(qtok & set(ch.tokens)) or 0.1,
            "content": ch.text[:500],
            "source": {
                "file": primary,
                "line": ch.line,
                "vault_page": ch.vault_path,
                "source_hash": indexed_hash or live_hash,
                "live_hash": live_hash,
                "stale": stale,
                "stale_reason": stale_reason,
            },
        }
        selected.append(hit)

    status = "ok" if scored else "no_hits"
    return {
        "status": status,
        "confidence": "high" if scored else "low",
        "allow_generation": bool(scored),
        "retrieval_method": "bm25",
        "corpus_size": manifest.get("corpus_size", len(chunks)),
        "degraded": None,
        "selected": selected,
    }
