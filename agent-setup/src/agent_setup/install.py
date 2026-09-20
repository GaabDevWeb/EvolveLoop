from __future__ import annotations

import json
import os
import shutil
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from agent_setup.backup import create_backup, sha256_file, sha256_text
from agent_setup.manifest import ManifestBundle, read_version
from agent_setup.paths import expand, repo_root, resolve_env_defaults
from agent_setup.state import init_state, load_state, save_state, state_dir


@dataclass
class InstallResult:
    ok: list[str] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)
    conflicts: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


def _resolve_source(spec: str, env: dict[str, str]) -> Path:
    if spec.startswith("bundled:"):
        rel = spec.split(":", 1)[1]
        return repo_root() / rel
    if spec.startswith("repo:"):
        rel = spec.split(":", 1)[1]
        for key, val in env.items():
            rel = rel.replace(f"${{{key}}}", val)
        return Path(os.path.expanduser(rel)).resolve()
    return Path(os.path.expanduser(spec)).resolve()


def _ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def _copy_or_link(src: Path, dest: Path, *, symlink: bool, force: bool, component: str, state: dict) -> str:
    """Returns status: installed|skipped|conflict|error"""
    if not src.exists():
        return "error:missing_source"

    if dest.exists() or dest.is_symlink():
        if dest.is_symlink() and dest.resolve() == src.resolve():
            return "skipped"
        if dest.is_file():
            if sha256_file(dest) == (sha256_file(src) if src.is_file() else ""):
                return "skipped"
        if not force:
            create_backup(component, dest)
            if dest.is_symlink() or dest.is_file():
                dest.unlink()
            elif dest.is_dir() and not symlink:
                return "conflict"
        else:
            if dest.is_symlink() or dest.is_file():
                dest.unlink()
            elif dest.is_dir():
                shutil.rmtree(dest)

    _ensure_parent(dest)
    if symlink:
        dest.symlink_to(src)
        state.setdefault("managed_links", []).append({"path": str(dest), "target": str(src), "component": component})
    elif src.is_dir():
        shutil.copytree(src, dest, dirs_exist_ok=True)
        state.setdefault("managed_files", []).append({"path": str(dest), "component": component, "kind": "dir"})
    else:
        shutil.copy2(src, dest)
        state.setdefault("managed_files", []).append(
            {"path": str(dest), "component": component, "sha256": sha256_file(dest), "kind": "file"}
        )
    return "installed"


def _merge_hooks(profile_data: dict, components: dict, env: dict[str, str]) -> str | None:
    if not profile_data.get("components", {}).get("hooks"):
        return None
    hooks_spec = components.get("hooks", {})
    dest_json = expand(hooks_spec.get("hooks_json", "~/.cursor/hooks.json"), extra=env)
    scripts_src = _resolve_source(hooks_spec.get("scripts_source", "bundled:cursor/hooks"), env)
    scripts_dest = expand(hooks_spec.get("destination", "~/.cursor/hooks"), extra=env)

    if scripts_src.is_dir():
        scripts_dest.mkdir(parents=True, exist_ok=True)
        for item in scripts_src.rglob("*"):
            if item.is_file():
                rel = item.relative_to(scripts_src)
                target = scripts_dest / rel
                target.parent.mkdir(parents=True, exist_ok=True)
                if not target.exists() or sha256_file(target) != sha256_file(item):
                    shutil.copy2(item, target)

    existing: dict = {"version": 1, "hooks": {}}
    if dest_json.is_file():
        existing = json.loads(dest_json.read_text(encoding="utf-8"))

    managed = hooks_spec.get("managed_keys", {})
    for event, entries in managed.items():
        merged = list(existing.get("hooks", {}).get(event, []))
        known_cmds = {e.get("command") for e in merged if isinstance(e, dict)}
        for entry in entries:
            cmd = entry if isinstance(entry, str) else entry.get("command")
            if cmd not in known_cmds:
                merged.append({"command": cmd, "timeout": 15} if isinstance(entry, str) else entry)
        existing.setdefault("hooks", {})[event] = merged

    _ensure_parent(dest_json)
    dest_json.write_text(json.dumps(existing, indent=2) + "\n", encoding="utf-8")
    return str(dest_json)


def write_user_config(env: dict[str, str], profile: str) -> Path:
    cfg_dir = state_dir()
    cfg_dir.mkdir(parents=True, exist_ok=True)
    cfg_path = cfg_dir / "config.yaml"
    if cfg_path.is_file():
        return cfg_path
    content = f"""# Agent Setup user config — generated
profile: {profile}
sources:
  vault: "{env['VAULT_ROOT']}"
  cursor_skills_repo: "{env['AGENTS_ROOT']}"
paths:
  cursor_dir: "~/.cursor"
  agents_skills_dir: "~/.agents/skills"
"""
    cfg_path.write_text(content, encoding="utf-8")
    return cfg_path


def install(profile: str = "standard", *, force: bool = False, dry_run: bool = False) -> InstallResult:
    result = InstallResult()
    env = resolve_env_defaults()
    os.environ.update({k: v for k, v in env.items() if v})

    bundle = ManifestBundle.load()
    profile_data = bundle.profile_components(profile)
    components = bundle.components
    version = read_version()

    if dry_run:
        result.ok.append(f"dry-run profile={profile}")
        return result

    state = load_state()
    if not state:
        state = init_state(profile, version)
    state["profile"] = profile
    state["version"] = version

    write_user_config(env, profile)

    # Rules
    for rule in components.get("rules", []):
        if profile not in rule.get("profiles", []):
            continue
        src = _resolve_source(rule["source"], env)
        dest = expand(rule["destination"], extra=env)
        status = _copy_or_link(src, dest, symlink=False, force=force, component=f"rule:{rule['name']}", state=state)
        _record(result, f"rule:{rule['name']}", status)

    # Commands
    for cmd in components.get("commands", []):
        if profile not in cmd.get("profiles", []):
            continue
        src = _resolve_source(cmd["source"], env)
        dest = expand(cmd["destination"], extra=env)
        status = _copy_or_link(src, dest, symlink=False, force=force, component=f"command:{cmd['name']}", state=state)
        _record(result, f"command:{cmd['name']}", status)

    # Skills
    for skill in components.get("skills", []):
        if profile not in skill.get("profiles", []):
            continue
        src = _resolve_source(skill["source"], env)
        dest = expand(skill["destination"], extra=env)
        use_symlink = skill.get("install") == "symlink"
        status = _copy_or_link(src, dest, symlink=use_symlink, force=force, component=f"skill:{skill['name']}", state=state)
        _record(result, f"skill:{skill['name']}", status)
        also = skill.get("also_link")
        if also and status in ("installed", "skipped"):
            link_dest = expand(also, extra=env)
            _copy_or_link(dest if dest.exists() else src, link_dest, symlink=True, force=force, component=f"skill-link:{skill['name']}", state=state)

    # Worker skills (standard/full)
    if profile_data.get("components", {}).get("worker_skills"):
        ws = components.get("worker_skills", {})
        base = ws.get("repo_base", "")
        for key, val in env.items():
            base = base.replace(f"${{{key}}}", val)
        for name in ws.get("names", []):
            src = Path(os.path.expanduser(base)) / name
            dest = expand(f"~/.cursor/skills/{name}", extra=env)
            status = _copy_or_link(src, dest, symlink=True, force=force, component=f"worker:{name}", state=state)
            _record(result, f"worker:{name}", status)

    # Hooks merge
    try:
        hooks_path = _merge_hooks(profile_data, components, env)
        if hooks_path:
            result.ok.append(f"hooks:merged → {hooks_path}")
    except OSError as exc:
        result.errors.append(f"hooks:{exc}")

    # Env template
    for tmpl in components.get("env_templates", []):
        if profile not in tmpl.get("profiles", []):
            continue
        src = _resolve_source(tmpl["source"], env)
        dest = expand(tmpl["destination"], extra=env)
        if dest.exists() and tmpl.get("on_conflict") == "preserve":
            result.skipped.append(f"env:{tmpl['name']} (preserve)")
            continue
        if src.suffix == ".template" or "template" in src.name:
            content = src.read_text(encoding="utf-8")
            for key, val in env.items():
                content = content.replace(f"{{{{{key}}}}}", val)
            _ensure_parent(dest)
            dest.write_text(content, encoding="utf-8")
            state.setdefault("managed_files", []).append(
                {"path": str(dest), "component": f"env:{tmpl['name']}", "kind": "file"}
            )
            _record(result, f"env:{tmpl['name']}", "installed")
        else:
            status = _copy_or_link(src, dest, symlink=False, force=force, component=f"env:{tmpl['name']}", state=state)
            _record(result, f"env:{tmpl['name']}", status)

    # RAG full profile
    if profile_data.get("components", {}).get("rag"):
        rag = components.get("rag", {})
        path_shim = rag.get("path_shim", "")
        for key, val in env.items():
            path_shim = path_shim.replace(f"${{{key}}}", val)
        shim = Path(os.path.expanduser(path_shim))
        if shim.is_file():
            try:
                subprocess.run(["bash", str(shim)], check=False, timeout=120)
                result.ok.append("rag:path_shim")
            except (OSError, subprocess.TimeoutExpired) as exc:
                result.errors.append(f"rag:path_shim:{exc}")

    # Systemd full profile
    if profile_data.get("components", {}).get("systemd_user"):
        sd = components.get("systemd", {})
        script = sd.get("install_script", "")
        for key, val in env.items():
            script = script.replace(f"${{{key}}}", val)
        script_path = Path(os.path.expanduser(script))
        if script_path.is_file():
            try:
                subprocess.run(["bash", str(script_path)], check=False, timeout=120)
                result.ok.append("systemd:installed")
            except (OSError, subprocess.TimeoutExpired) as exc:
                result.errors.append(f"systemd:{exc}")

    save_state(state)
    return result


def _record(result: InstallResult, name: str, status: str) -> None:
    if status == "installed":
        result.ok.append(name)
    elif status == "skipped":
        result.skipped.append(f"{name} (already configured)")
    elif status.startswith("conflict"):
        result.conflicts.append(name)
    elif status.startswith("error"):
        result.errors.append(f"{name}:{status}")


def uninstall(*, managed_only: bool = True) -> InstallResult:
    result = InstallResult()
    state = load_state()
    if not state:
        result.skipped.append("nothing installed")
        return result

    for entry in reversed(state.get("managed_links", [])):
        path = Path(entry["path"])
        if path.is_symlink() or path.exists():
            path.unlink(missing_ok=True)
            result.ok.append(f"removed link {path}")

    for entry in reversed(state.get("managed_files", [])):
        path = Path(entry["path"])
        if path.is_dir():
            shutil.rmtree(path, ignore_errors=True)
        elif path.exists():
            path.unlink()
        result.ok.append(f"removed {path}")

    save_state({})
    return result
