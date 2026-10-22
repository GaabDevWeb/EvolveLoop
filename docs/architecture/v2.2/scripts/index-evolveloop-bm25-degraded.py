#!/usr/bin/env python3
"""BM25-only index extension for EvolveLoop corpus when Ollama is unavailable (ADR-0005 degraded)."""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--wiki-root", required=True, help="karpathyWiki KNOWLEDGE_PATH")
    parser.add_argument("--corpus-yaml", required=True)
    parser.add_argument("--corpus-set", default="evolveloop")
    args = parser.parse_args()

    wiki = Path(args.wiki_root).resolve()
    os.environ.setdefault("KNOWLEDGE_PATH", str(wiki))
    os.environ.setdefault("WIKI_ROOT", str(wiki))
    os.environ["CORPUS_YAML"] = str(Path(args.corpus_yaml).resolve())
    os.environ["CORPUS_SET"] = args.corpus_set

    # Import after env — gaabwiki reads settings at import
    from gaabwiki.chunking import ChunkParams, chunk_document, document_content_hash
    from gaabwiki.config import get_settings, reset_settings_cache
    from gaabwiki.ingestion.corpus import resolve_corpus_files
    from gaabwiki.ingestion.parser import parse_document
    from gaabwiki.models import Chunk
    from gaabwiki.storage.bm25_index import BM25Index
    from gaabwiki.storage.lancedb_store import LanceVectorStore

    reset_settings_cache()
    settings = get_settings().resolve_paths()
    root = settings.knowledge_path

    files = resolve_corpus_files(root, settings.corpus_yaml, settings.corpus_set)
    params = ChunkParams(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
    )

    new_chunks: list[Chunk] = []
    for path in files:
        doc = parse_document(path, root)
        doc_hash = document_content_hash(doc.body, doc.source_path)
        for c in chunk_document(doc, params):
            new_chunks.append(c)

    store = LanceVectorStore(settings.vector_db_path)
    bm25 = BM25Index(settings.bm25_path)
    bm25.load()

    existing = store.all_chunks_as_dicts()
    by_id: dict[str, dict] = {str(r.get("chunk_id")): r for r in existing if r.get("chunk_id")}
    for c in new_chunks:
        by_id[c.chunk_id] = {
            "chunk_id": c.chunk_id,
            "document_id": c.document_id,
            "source_path": c.source_path,
            "title": c.title,
            "section": c.section,
            "content_hash": c.content_hash,
            "content": c.content,
            "project": c.project or "EvolveLoop",
            "type": c.type or "",
            "status": c.status or "",
            "page_id": c.page_id or "",
            "chunk_index": c.chunk_index,
        }

    merged = list(by_id.values())
    bm25.rebuild(merged)

    out = {
        "ok": True,
        "mode": "bm25_degraded_no_ollama",
        "evolveloop_files": len(files),
        "new_chunks": len(new_chunks),
        "bm25_rows": bm25.count(),
        "lance_rows": store.count(),
        "corpus_set": args.corpus_set,
    }
    print(json.dumps(out, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
