from __future__ import annotations

import json
import subprocess
from dataclasses import dataclass, field
from pathlib import Path

from agent_setup.paths import repo_root, resolve_env_defaults


@dataclass
class ProjectAnalysis:
    root: Path
    language: str = "unknown"
    framework: str = "unknown"
    package_manager: str = "unknown"
    has_tests: bool = False
    has_ci: bool = False
    has_cursor: bool = False
    has_wiki: bool = False
    has_agent_yaml: bool = False
    notes: list[str] = field(default_factory=list)


def analyze_project(root: Path) -> ProjectAnalysis:
    analysis = ProjectAnalysis(root=root.resolve())
    if (root / "pyproject.toml").is_file():
        analysis.language = "python"
        analysis.package_manager = "pip"
    elif (root / "package.json").is_file():
        analysis.language = "javascript"
        analysis.package_manager = "npm"
    elif (root / "go.mod").is_file():
        analysis.language = "go"
    elif (root / "Cargo.toml").is_file():
        analysis.language = "rust"

    if (root / "tests").is_dir() or (root / "test").is_dir():
        analysis.has_tests = True
    if (root / ".github" / "workflows").is_dir():
        analysis.has_ci = True
    if (root / ".cursor").is_dir():
        analysis.has_cursor = True
    if (root / "wiki").is_dir() or (root / ".ai").is_dir():
        analysis.has_wiki = True
    if (root / ".agent.yaml").is_file():
        analysis.has_agent_yaml = True

    return analysis


def init_project(root: Path | None = None, *, enable_rag: bool = False) -> dict:
    """Prepare project-level AI configuration."""
    target = (root or Path.cwd()).resolve()
    env = resolve_env_defaults()
    analysis = analyze_project(target)
    actions: list[str] = []

    agent_yaml = target / ".agent.yaml"
    if not agent_yaml.is_file():
        template = repo_root() / "templates" / "project" / ".agent.yaml"
        if template.is_file():
            content = template.read_text(encoding="utf-8")
            content = content.replace("{{PROJECT_NAME}}", target.name)
            content = content.replace("{{VAULT_ROOT}}", env["VAULT_ROOT"])
            agent_yaml.write_text(content, encoding="utf-8")
            actions.append(f"created {agent_yaml}")

    cursor_dir = target / ".cursor"
    if not analysis.has_cursor:
        cursor_dir.mkdir(exist_ok=True)
        actions.append(f"created {cursor_dir}")

    ai_dir = target / ".ai" / "sessions"
    ai_dir.mkdir(parents=True, exist_ok=True)
    readme = ai_dir / "README.md"
    if not readme.is_file():
        shutil_copy(repo_root() / "templates" / "wiki" / "sessions-README.md", readme)
        actions.append(f"created {readme}")

    if enable_rag and Path(env["VAULT_ROOT"]).is_dir():
        rag_env = Path(env["VAULT_ROOT"]) / "rag" / ".env"
        if rag_env.is_file():
            actions.append("rag: vault .env exists (not modified)")
        else:
            example = Path(env["VAULT_ROOT"]) / "rag" / ".env.example"
            if example.is_file():
                actions.append("rag: copy rag/.env.example manually (secrets)")

    return {
        "root": str(target),
        "analysis": {
            "language": analysis.language,
            "framework": analysis.framework,
            "package_manager": analysis.package_manager,
            "has_tests": analysis.has_tests,
            "has_ci": analysis.has_ci,
            "has_cursor": analysis.has_cursor or cursor_dir.is_dir(),
            "has_wiki": analysis.has_wiki,
        },
        "actions": actions,
    }


def shutil_copy(src: Path, dest: Path) -> None:
    import shutil

    if src.is_file():
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)
