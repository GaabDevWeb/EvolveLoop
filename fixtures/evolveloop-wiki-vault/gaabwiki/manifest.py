from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def manifest_path(vault_root: Path) -> Path:
    return vault_root / ".data" / "manifest.json"


def load_manifest(vault_root: Path) -> dict[str, Any]:
    p = manifest_path(vault_root)
    if not p.is_file():
        return {"sources": {}, "chunks": []}
    return json.loads(p.read_text(encoding="utf-8"))


def save_manifest(vault_root: Path, data: dict[str, Any]) -> None:
    p = manifest_path(vault_root)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, indent=2, sort_keys=True), encoding="utf-8")


def source_hash(vault_root: Path, repo_rel: str, monorepo_root: Path | None) -> str | None:
    if not monorepo_root:
        return None
    fp = monorepo_root / repo_rel
    if not fp.is_file():
        return None
    return sha256_file(fp)
