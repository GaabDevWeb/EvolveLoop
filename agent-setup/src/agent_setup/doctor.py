from __future__ import annotations

from dataclasses import dataclass, field

from agent_setup.detect import detect
from agent_setup.diff import _systemd_user_status
from agent_setup.manifest import read_version
from agent_setup.paths import expand, resolve_env_defaults
from agent_setup.state import load_state


@dataclass
class DoctorReport:
    sections: list[tuple[str, list[tuple[str, str]]]] = field(default_factory=list)
    status: str = "healthy"

    def add(self, section: str, symbol: str, message: str) -> None:
        if not self.sections or self.sections[-1][0] != section:
            self.sections.append((section, []))
        self.sections[-1][1].append((symbol, message))
        if symbol == "✗":
            self.status = "broken"
        elif symbol == "⚠" and self.status == "healthy":
            self.status = "degraded"

    def render(self) -> str:
        lines = ["Agent Environment Doctor", ""]
        for section, items in self.sections:
            lines.append(section)
            for sym, msg in items:
                lines.append(f"{sym} {msg}")
            lines.append("")
        lines.append(f"Status: {self.status.upper()}")
        return "\n".join(lines)


def doctor(profile: str | None = None) -> DoctorReport:
    report = DoctorReport()
    det = detect()
    env = resolve_env_defaults()
    state = load_state()
    active_profile = profile or state.get("profile", "standard")

    report.add("System", "✓" if det.distribution != "unknown" else "⚠", det.distribution)
    report.add("System", "✓" if det.git.get("installed") else "✗", f"Git {det.git.get('version') or 'missing'}")
    report.add("System", "✓", f"Python {det.python.get('version')}")

    report.add("IDE", "✓" if det.cursor.get("installed") else "✗", "Cursor")

    report.add("Core", "✓" if expand("~/.cursor/rules/wiki-agent.mdc", extra=env).is_file() else "✗", "Rules wiki-agent")
    report.add("Core", "✓" if expand("~/.cursor/hooks.json", extra=env).is_file() else "✗", "Hooks")
    report.add("Core", "✓" if expand("~/.cursor/skills/wiki/SKILL.md", extra=env).is_file() else "✗", "Skill wiki")

    report.add("Wiki", "✓" if Path(env["VAULT_ROOT"]).is_dir() else "✗", f"Vault {env['VAULT_ROOT']}")
    rag_venv = Path(env["VAULT_ROOT"]) / "rag" / ".venv" / "bin" / "wiki"
    report.add("Wiki", "✓" if rag_venv.is_file() else "⚠", "RAG venv/CLI")
    sessions = Path(env["VAULT_ROOT"]) / ".ai" / "sessions"
    report.add("Wiki", "✓" if sessions.is_dir() else "⚠", "Memory sessions dir")

    if active_profile == "full" or state.get("profile") == "full":
        watch = _systemd_user_status("wiki-watch.service")
        sym = "✓" if watch == "active" else "⚠" if watch == "inactive" else "✗"
        report.add("Services", sym, f"watch ({watch})")
        timer = _systemd_user_status("wiki-health.timer")
        sym = "✓" if timer == "active" else "⚠"
        report.add("Services", sym, f"health timer ({timer})")

    report.add("Providers", "✓" if det.cursor.get("installed") else "⚠", "Cursor")
    if det.ollama.get("reachable"):
        report.add("Providers", "✓", "Ollama reachable")
    else:
        report.add("Providers", "⚠", "Ollama unavailable")

    report.add("Agent Setup", "✓", f"version {read_version()}")
    if state:
        report.add("Agent Setup", "✓", f"profile {state.get('profile')} installed")
    else:
        report.add("Agent Setup", "⚠", "not installed via agent-setup")

    return report


from pathlib import Path  # noqa: E402
