from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from agent_setup.paths import repo_root


def _load_yaml(path: Path) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8")
    try:
        import yaml

        return yaml.safe_load(text) or {}
    except ImportError:
        return _minimal_yaml(text)


def _minimal_yaml(text: str) -> dict[str, Any]:
    """Parse flat YAML-like manifest without PyYAML."""
    root: dict[str, Any] = {}
    stack: list[tuple[dict, int]] = [(root, -1)]
    for raw in text.splitlines():
        if not raw.strip() or raw.strip().startswith("#"):
            continue
        indent = len(raw) - len(raw.lstrip())
        line = raw.strip()
        while stack and indent <= stack[-1][1]:
            stack.pop()
        parent = stack[-1][0]
        if line.endswith(":"):
            key = line[:-1]
            parent[key] = {}
            stack.append((parent[key], indent))
        elif ":" in line:
            key, _, val = line.partition(":")
            val = val.strip()
            if val.startswith("[") and val.endswith("]"):
                inner = val[1:-1].strip()
                parent[key.strip()] = [x.strip() for x in inner.split(",") if x.strip()] if inner else []
            elif val.lower() in ("true", "false"):
                parent[key.strip()] = val.lower() == "true"
            else:
                parent[key.strip()] = val.strip('"')
    return root


@dataclass
class ManifestBundle:
    manifest: dict[str, Any] = field(default_factory=dict)
    profiles: dict[str, Any] = field(default_factory=dict)
    components: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def load(cls, root: Path | None = None) -> ManifestBundle:
        base = root or repo_root()
        mdir = base / "manifest"
        return cls(
            manifest=_load_yaml(mdir / "manifest.yaml"),
            profiles=_load_yaml(mdir / "profiles.yaml"),
            components=_load_yaml(mdir / "components.yaml"),
        )

    def profile_components(self, profile: str) -> dict[str, Any]:
        pdata = self.profiles.get("profiles", {}).get(profile, {})
        if not pdata:
            raise ValueError(f"Unknown profile: {profile}")
        merged: dict[str, Any] = {}
        extends = pdata.get("extends")
        if extends:
            base = self.profile_components(extends)
            merged.update(base.get("components", {}))
        comp = pdata.get("components", {})
        for key, val in comp.items():
            if isinstance(val, list) and isinstance(merged.get(key), list):
                merged[key] = list(dict.fromkeys(list(merged[key]) + list(val)))
            else:
                merged[key] = val
        return {"profile": profile, "components": merged}


def read_version(root: Path | None = None) -> str:
    vfile = (root or repo_root()) / "VERSION"
    if vfile.is_file():
        return vfile.read_text(encoding="utf-8").strip()
    return "0.0.0"
