from __future__ import annotations

import hashlib
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from agent_setup.state import state_dir


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def create_backup(component: str, source: Path, meta: dict[str, Any] | None = None) -> str | None:
    if not source.exists():
        return None
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_root = state_dir() / "backups" / ts
    backup_root.mkdir(parents=True, exist_ok=True)
    rel = source.name if source.is_file() else source.name
    dest = backup_root / rel
    if source.is_dir():
        shutil.copytree(source, dest, dirs_exist_ok=True)
    else:
        shutil.copy2(source, dest)
    record = {
        "timestamp": ts,
        "component": component,
        "original": str(source),
        "backup": str(dest),
        **(meta or {}),
    }
    manifest = backup_root / "manifest.json"
    existing = []
    if manifest.is_file():
        existing = json.loads(manifest.read_text(encoding="utf-8"))
    existing.append(record)
    manifest.write_text(json.dumps(existing, indent=2) + "\n", encoding="utf-8")
    return ts
