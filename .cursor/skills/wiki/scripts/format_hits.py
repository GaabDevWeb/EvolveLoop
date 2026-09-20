#!/usr/bin/env python3
"""Compacta JSON de `python -m gaabwiki search --json` para injectar no Agent."""
from __future__ import annotations

import json
import sys


def main() -> None:
    raw = sys.stdin.read()
    if not raw.strip():
        print("EMPTY_RESPONSE: sem JSON do wiki search")
        return
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        print(raw[:2000])
        return

    status = data.get("status") or data.get("reason")
    confidence = data.get("confidence")
    allow = data.get("allow_generation")
    degraded = data.get("degraded")
    degraded_reason = data.get("degraded_reason")
    method = data.get("retrieval_method")
    corpus_size = data.get("corpus_size")

    print(
        f"status={status} confidence={confidence} allow={allow} "
        f"method={method} degraded={degraded} reason={degraded_reason} "
        f"corpus_size={corpus_size}"
    )
    print("---")

    # Distinções críticas: nunca tratar ollama_unavailable como empty_corpus
    if status == "empty_corpus":
        print("GAP: empty_corpus — índice BM25 sem documentos (não é falha do Ollama)")
        return
    if status == "no_hits":
        print("GAP: no_hits — corpus indexado mas query sem matches")
        if degraded:
            print(f"(nota: retrieval degradado: {degraded_reason})")
        return

    selected = data.get("selected") or data.get("results") or data.get("hybrid") or []
    if not selected:
        print("GAP: nenhum chunk seleccionado")
        if degraded:
            print(f"(degraded={degraded_reason})")
        return

    if degraded:
        print(f"DEGRADED: {degraded_reason} — a usar BM25 only")
        print()

    for i, s in enumerate(selected, 1):
        if isinstance(s, dict) and "source" in s and isinstance(s["source"], dict):
            # SearchHit.model_dump()
            source = s["source"].get("file") or "?"
            score = float(s.get("score") or 0)
            preview = (s.get("content") or "")[:400].replace("\n", " ")
        else:
            source = (s.get("source") if isinstance(s.get("source"), str) else None) or s.get("path") or "?"
            score = float(s.get("score") or 0)
            preview = (s.get("preview") or s.get("text") or s.get("content") or "")[:400].replace("\n", " ")
        print(f"[{i}] {source} score={score:.3f}")
        print(preview)
        print()


if __name__ == "__main__":
    main()
