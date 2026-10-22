#!/usr/bin/env python3
"""V22 bench token count — mirrors harness load_tokenizer (tiktoken or whitespace proxy)."""
from __future__ import annotations

import sys


def _count(text: str) -> int:
    try:
        import tiktoken

        enc = tiktoken.get_encoding("cl100k_base")
        return len(enc.encode(text))
    except ImportError:
        return len([x for x in text.split() if x])


def main() -> int:
    if len(sys.argv) > 1 and sys.argv[1] == "--label":
        try:
            import tiktoken  # noqa: F401

            print("tiktoken:cl100k_base")
        except ImportError:
            print("PROXY:whitespace_split")
        return 0

    if len(sys.argv) > 1 and sys.argv[1] == "--batch":
        import json

        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            print(_count(json.loads(line)))
        return 0

    text = sys.stdin.read()
    print(_count(text))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
