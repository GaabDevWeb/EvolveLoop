from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from agent_setup.manifest import ManifestBundle
from agent_setup.paths import expand, resolve_env_defaults
from agent_setup.state import load_state


@dataclass
class DiffLine:
    symbol: str
    message: str


@dataclass
class DiffReport:
    lines: list[DiffLine] = field(default_factory=list)

    def add(self, symbol: str, message: str) -> None:
        self.lines.append(DiffLine(symbol, message))

    def render(self) -> str:
        out = ["Agent Setup Diff", ""]
        for line in self.lines:
            out.append(f"{line.symbol} {line.message}")
        return "\n".join(out)


def diff(profile: str = "standard") -> DiffReport:
    report = DiffReport()
    env = resolve_env_defaults()
    bundle = ManifestBundle.load()
    profile_data = bundle.profile_components(profile)
    components = bundle.components
    state = load_state()

    report.add("", f"Profile: {profile}")
    report.add("", f"Installed profile: {state.get('profile', 'not installed')}")

    # Skills
    report.add("", "SKILLS")
    for skill in components.get("skills", []):
        if profile not in skill.get("profiles", []):
            continue
        dest = expand(skill["destination"], extra=env)
        name = skill["name"]
        if not dest.exists():
            report.add("✗", f"{name} missing")
        elif _managed_match(state, str(dest)):
            report.add("✓", name)
        else:
            report.add("⚠", f"{name} present but not managed / possibly modified locally")

    # Rules
    report.add("", "RULES")
    for rule in components.get("rules", []):
        if profile not in rule.get("profiles", []):
            continue
        dest = expand(rule["destination"], extra=env)
        if dest.is_file():
            report.add("✓" if _managed_match(state, str(dest)) else "⚠", rule["name"])
        else:
            report.add("✗", f"{rule['name']} missing")

    # Hooks
    report.add("", "HOOKS")
    hooks_json = expand("~/.cursor/hooks.json", extra=env)
    if hooks_json.is_file():
        report.add("✓", "hooks.json exists")
        text = hooks_json.read_text(encoding="utf-8")
        if "wiki-mem/session-start.sh" in text:
            report.add("✓", "sessionStart wiki-mem")
        else:
            report.add("✗", "sessionStart wiki-mem missing")
    else:
        report.add("✗", "hooks.json missing")

    # Services
    if profile_data.get("components", {}).get("systemd_user"):
        report.add("", "SERVICES")
        for unit in ["wiki-watch.service", "wiki-health.timer"]:
            status = _systemd_user_status(unit)
            sym = "✓" if status == "active" else "✗" if status == "missing" else "⚠"
            report.add(sym, f"{unit} {status}")

    # Providers
    report.add("", "PROVIDERS")
    from agent_setup.detect import detect

    det = detect()
    if det.ollama.get("reachable"):
        report.add("✓", "Ollama reachable")
    elif det.ollama.get("installed"):
        report.add("⚠", "Ollama installed but unreachable")
    else:
        report.add("⚠", "Ollama unavailable (optional)")

    agents_env = expand("~/.cursor/agents.env", extra=env)
    report.add("✓" if agents_env.is_file() else "✗", "agents.env")

    return report


def _managed_match(state: dict, path: str) -> bool:
    for entry in state.get("managed_files", []) + state.get("managed_links", []):
        if entry.get("path") == path:
            return True
    return False


def _systemd_user_status(unit: str) -> str:
    import subprocess

    try:
        proc = subprocess.run(
            ["systemctl", "--user", "is-active", unit],
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
        if proc.returncode == 0:
            return "active"
        return proc.stdout.strip() or "inactive"
    except (OSError, subprocess.TimeoutExpired):
        return "missing"
