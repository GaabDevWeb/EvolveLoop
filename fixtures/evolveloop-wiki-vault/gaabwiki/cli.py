from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from .indexing import rebuild, search


def vault_root() -> Path:
    root = os.environ.get("WIKI_ROOT") or os.environ.get("RAG_REPO_ROOT")
    if not root:
        print("WIKI_ROOT is required", file=sys.stderr)
        sys.exit(1)
    return Path(root).resolve()


def monorepo_root() -> Path | None:
    env = os.environ.get("EVOLVELOOP_MONOREPO_ROOT") or os.environ.get("AGENTS_ROOT")
    if env:
        p = Path(env).resolve()
        return p if p.is_dir() else None
    return None


def cmd_rebuild(args: argparse.Namespace) -> None:
    stats = rebuild(vault_root(), monorepo_root(), incremental=args.incremental)
    print(json.dumps({"ok": True, "corpus_size": stats["corpus_size"]}))


def cmd_search(args: argparse.Namespace) -> None:
    out = search(
        vault_root(),
        args.query,
        top_k=args.top_k,
        monorepo_root=monorepo_root(),
        projeto=args.projeto,
    )
    if args.json:
        print(json.dumps(out, ensure_ascii=False))
    else:
        for i, s in enumerate(out.get("selected") or [], 1):
            src = s.get("source") or {}
            print(f"{i}. {src.get('file')}:{src.get('line')} score={s.get('score')}")
            print((s.get("content") or "")[:200])


def cmd_health(_: argparse.Namespace) -> None:
    root = vault_root()
    data_dir = root / ".data" / "manifest.json"
    ok = data_dir.is_file()
    print(
        json.dumps(
            {
                "ok": ok,
                "vault": str(root),
                "manifest": str(data_dir),
                "corpus_indexed": ok,
            }
        )
    )
    if not ok:
        sys.exit(1)


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="gaabwiki")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_rebuild = sub.add_parser("rebuild", help="Index vault markdown (BM25 manifest)")
    p_rebuild.add_argument("--incremental", action="store_true")
    p_rebuild.set_defaults(func=cmd_rebuild)

    p_search = sub.add_parser("search")
    p_search.add_argument("query")
    p_search.add_argument("--json", action="store_true")
    p_search.add_argument("--top-k", type=int, default=8)
    p_search.add_argument("--projeto", default=None)
    p_search.set_defaults(func=cmd_search)

    p_health = sub.add_parser("health")
    p_health.set_defaults(func=cmd_health)

    args = parser.parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main()
