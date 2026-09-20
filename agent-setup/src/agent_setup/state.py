from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def state_dir() -> Path:
    return Path.home() / ".agent-setup"


def state_file() -> Path:
    return state_dir() / "state.json"


def load_state() -> dict[str, Any]:
    path = state_file()
    if not path.is_file():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def save_state(state: dict[str, Any]) -> None:
    path = state_file()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(state, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def init_state(profile: str, version: str) -> dict[str, Any]:
    return {
        "version": version,
        "profile": profile,
        "installed_at": datetime.now(timezone.utc).isoformat(),
        "managed_files": [],
        "managed_links": [],
        "services": [],
        "config_path": str(state_dir() / "config.yaml"),
    }
