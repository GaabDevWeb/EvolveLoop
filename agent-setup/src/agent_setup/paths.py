from __future__ import annotations

import os
from pathlib import Path


def repo_root() -> Path:
    env = os.environ.get("AGENT_SETUP_ROOT")
    if env:
        return Path(env).expanduser().resolve()
    return Path(__file__).resolve().parents[2]


def expand(path: str, *, extra: dict[str, str] | None = None) -> Path:
    mapping = {
        "HOME": str(Path.home()),
        "AGENTS_ROOT": os.environ.get("AGENTS_ROOT", ""),
        "VAULT_ROOT": os.environ.get("VAULT_ROOT", ""),
    }
    if extra:
        mapping.update(extra)
    text = path
    for key, value in mapping.items():
        text = text.replace(f"${{{key}}}", value).replace(f"~", str(Path.home()), 1)
    return Path(os.path.expanduser(text)).resolve()


def load_user_config() -> dict:
    cfg_path = Path.home() / ".agent-setup" / "config.yaml"
    if not cfg_path.is_file():
        return {}
    try:
        import yaml  # optional; fallback below
    except ImportError:
        return _parse_simple_yaml(cfg_path.read_text(encoding="utf-8"))
    return yaml.safe_load(cfg_path.read_text(encoding="utf-8")) or {}


def _parse_simple_yaml(text: str) -> dict:
    """Minimal YAML subset when PyYAML not installed."""
    result: dict = {}
    current: dict | None = None
    section: str | None = None
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.endswith(":") and not line.startswith(" "):
            section = line[:-1]
            result[section] = {}
            current = result[section]
            continue
        if ":" in line and current is not None:
            k, _, v = line.partition(":")
            current[k.strip()] = v.strip().strip('"')
    return result


def resolve_env_defaults() -> dict[str, str]:
    cfg = load_user_config()
    sources = cfg.get("sources", {})
    # Wiki corpus: prefer WIKI_ROOT / RAG_REPO_ROOT / VAULT_ROOT — no hardcoded username path
    vault = (
        sources.get("vault")
        or os.environ.get("WIKI_ROOT")
        or os.environ.get("VAULT_ROOT")
        or os.environ.get("RAG_REPO_ROOT")
        or ""
    )
    # AGENTS_ROOT default path is DEFERRED (portability) — keep env/config only when unset
    agents = sources.get("cursor_skills_repo") or os.environ.get("AGENTS_ROOT") or ""
    return {"VAULT_ROOT": vault, "AGENTS_ROOT": agents}
