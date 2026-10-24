"""Caveman hard gate installs by symlink and a second run does not duplicate it."""

import json
import os
import subprocess
from pathlib import Path

from agent_setup.install import install

REPO = Path(__file__).resolve().parents[2]
HOOK = "caveman-hard-gate.sh"
EXCEPTION_LINE = (
    "code, commands, paths, evidence, SHAs, commit messages, user docs, "
    "task reports (structured fields), security content"
)


def _isolate_home(monkeypatch, home: Path) -> None:
    home.mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv("HOME", str(home))
    monkeypatch.setenv("AGENTS_ROOT", str(REPO))
    for key in ("WIKI_ROOT", "VAULT_ROOT", "RAG_REPO_ROOT"):
        monkeypatch.delenv(key, raising=False)


def _run_hook(value: str | None) -> dict:
    env = os.environ.copy()
    script = REPO / "agent-setup" / "cursor" / "hooks" / HOOK
    if value is None:
        env.pop("EVOLVELOOP_BREVITY_CAVEMAN", None)
    else:
        env["EVOLVELOOP_BREVITY_CAVEMAN"] = value
    proc = subprocess.run(
        ["bash", str(script)],
        check=True,
        capture_output=True,
        text=True,
        env=env,
    )
    return json.loads(proc.stdout)


def test_hook_default_on_and_opt_out():
    on = _run_hook(None)
    assert EXCEPTION_LINE in on["additional_context"]
    assert "EVOLVELOOP_BREVITY_CAVEMAN=off" in on["additional_context"]
    assert _run_hook("off") == {}
    assert _run_hook("OFF") == {}
    assert _run_hook("0") == {}
    explicit = _run_hook("on")
    assert "additional_context" in explicit


def test_repo_copies_match():
    for rel in (
        Path("hooks") / HOOK,
        Path("rules") / "caveman-hard-gate.mdc",
    ):
        project = (REPO / ".cursor" / rel).read_bytes()
        bundled = (REPO / "agent-setup" / "cursor" / rel).read_bytes()
        assert project == bundled
    assert EXCEPTION_LINE.encode() in (REPO / ".cursor" / "rules" / "caveman-hard-gate.mdc").read_bytes()


def test_install_caveman_gate_is_idempotent(tmp_path: Path, monkeypatch):
    home = tmp_path / "home"
    _isolate_home(monkeypatch, home)

    first = install(profile="standard")
    assert first.errors == []
    assert first.conflicts == []

    skill = home / ".cursor" / "skills" / "caveman"
    assert skill.is_symlink()
    assert skill.resolve() == (REPO / "vendor" / "juliusbrussee-caveman" / "skills" / "caveman").resolve()
    assert (skill / "SKILL.md").is_file()

    rule = home / ".cursor" / "rules" / "caveman-hard-gate.mdc"
    assert rule.is_file()
    assert "EVOLVELOOP_BREVITY_CAVEMAN=off" in rule.read_text(encoding="utf-8")

    for name in ("agent-authoring", "code-reviewer", "validator", "testing", "orquestrar"):
        link = home / ".cursor" / "skills" / name
        assert link.is_symlink(), name

    hooks = json.loads((home / ".cursor" / "hooks.json").read_text(encoding="utf-8"))
    commands = [entry.get("command") for entry in hooks["hooks"]["sessionStart"]]
    assert commands.count(f"./hooks/{HOOK}") == 1
    assert (home / ".cursor" / "hooks" / HOOK).is_file()

    second = install(profile="standard")
    assert second.errors == []
    assert second.conflicts == []
    assert "skill:caveman (already configured)" in second.skipped
    assert "rule:caveman-hard-gate (already configured)" in second.skipped
    hooks_again = json.loads((home / ".cursor" / "hooks.json").read_text(encoding="utf-8"))
    commands_again = [entry.get("command") for entry in hooks_again["hooks"]["sessionStart"]]
    assert commands_again.count(f"./hooks/{HOOK}") == 1
