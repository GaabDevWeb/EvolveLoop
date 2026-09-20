#!/usr/bin/env python3
"""Compacta JSON de wiki-ingest search para injectar no Agent."""
from __future__ import annotations

import json
import sys


def main() -> None:
    raw = sys.stdin.read()
    if not raw.strip():
        print("EMPTY_RESPONSE: sem JSON do ingest")
        return
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        print(raw[:2000])
        return

    reason = data.get("reason")
    confidence = data.get("confidence")
    allow = data.get("allow_generation")
    print(f"reason={reason} confidence={confidence} allow={allow}")
    print("---")
    selected = data.get("selected") or []
    if not selected:
        print("GAP: nenhum chunk seleccionado")
        return
    for i, s in enumerate(selected, 1):
        source = s.get("source") or s.get("path") or "?"
        score = float(s.get("score") or 0)
        preview = (s.get("preview") or s.get("text") or "")[:400].replace("\n", " ")
        print(f"[{i}] {source} score={score:.3f}")
        print(preview)
        print()


if __name__ == "__main__":
    main()
