"""Legacy wiki/wiki-mem directories used to abort with CONFLICT.

The installer must move that tree aside (never delete it) and leave a symlink.
A second install is idempotent.
"""

from pathlib import Path

from agent_setup.install import _copy_or_link, install

REPO = Path(__file__).resolve().parents[2]
MARKER = "V22-POST-001-legacy-marker.txt"


def _isolate_home(monkeypatch, home: Path, agents_root: Path | None = None) -> None:
    home.mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv("HOME", str(home))
    if agents_root is not None:
        monkeypatch.setenv("AGENTS_ROOT", str(agents_root))
    for key in ("WIKI_ROOT", "VAULT_ROOT", "RAG_REPO_ROOT"):
        monkeypatch.delenv(key, raising=False)


def _write_legacy(dest: Path, text: str) -> Path:
    dest.mkdir(parents=True)
    marker = dest / MARKER
    marker.write_text(text, encoding="utf-8")
    (dest / "SKILL.md").write_text("stale copied skill\n", encoding="utf-8")
    return marker


def test_copy_or_link_moves_legacy_directory_then_skips(tmp_path: Path, monkeypatch):
    home = tmp_path / "home"
    _isolate_home(monkeypatch, home)
    src = tmp_path / "canonical-wiki"
    src.mkdir()
    (src / "SKILL.md").write_text("canonical\n", encoding="utf-8")
    dest = tmp_path / "wiki"
    _write_legacy(dest, "keep-me\n")
    state: dict = {}

    status = _copy_or_link(
        src, dest, symlink=True, force=False, component="skill:wiki", state=state
    )
    assert status == "installed"
    assert dest.is_symlink()
    assert dest.resolve() == src.resolve()
    assert not (dest / MARKER).exists()
    assert (src / "SKILL.md").read_text(encoding="utf-8") == "canonical\n"

    moved = list((home / ".agent-setup" / "backups").rglob(MARKER))
    assert len(moved) == 1
    assert moved[0].read_text(encoding="utf-8") == "keep-me\n"
    manifest = moved[0].parents[1] / "manifest.json"
    assert '"method": "move"' in manifest.read_text(encoding="utf-8")

    again = _copy_or_link(
        src, dest, symlink=True, force=False, component="skill:wiki", state=state
    )
    assert again == "skipped"
    assert list((home / ".agent-setup" / "backups").rglob(MARKER)) == moved


def test_directory_copy_without_symlink_keeps_tree_and_conflicts(tmp_path: Path, monkeypatch):
    home = tmp_path / "home"
    _isolate_home(monkeypatch, home)
    src = tmp_path / "src"
    src.mkdir()
    (src / "SKILL.md").write_text("canonical\n", encoding="utf-8")
    dest = tmp_path / "not-a-symlink-target"
    marker = _write_legacy(dest, "keep-me\n")

    status = _copy_or_link(
        src, dest, symlink=False, force=False, component="rule:example", state={}
    )
    assert status == "conflict"
    assert marker.read_text(encoding="utf-8") == "keep-me\n"
    assert dest.is_dir() and not dest.is_symlink()


def test_force_moves_directory_instead_of_deleting(tmp_path: Path, monkeypatch):
    home = tmp_path / "home"
    _isolate_home(monkeypatch, home)
    src = tmp_path / "src"
    src.mkdir()
    (src / "SKILL.md").write_text("canonical\n", encoding="utf-8")
    dest = tmp_path / "wiki"
    _write_legacy(dest, "keep-me\n")

    status = _copy_or_link(
        src, dest, symlink=False, force=True, component="skill:wiki", state={}
    )
    assert status == "installed"
    assert dest.is_dir() and not dest.is_symlink()
    assert (dest / "SKILL.md").read_text(encoding="utf-8") == "canonical\n"
    assert not (dest / MARKER).exists()
    moved = list((home / ".agent-setup" / "backups").rglob(MARKER))
    assert len(moved) == 1
    assert moved[0].read_text(encoding="utf-8") == "keep-me\n"


def test_install_standard_migrates_legacy_wiki_and_is_idempotent(tmp_path: Path, monkeypatch):
    home = tmp_path / "home"
    _isolate_home(monkeypatch, home, REPO)
    wiki = home / ".cursor" / "skills" / "wiki"
    wiki_mem = home / ".cursor" / "skills" / "wiki-mem"
    _write_legacy(wiki, "wiki-keep\n")
    _write_legacy(wiki_mem, "mem-keep\n")

    first = install(profile="standard")
    assert first.conflicts == []
    assert first.errors == []
    assert "skill:wiki" in first.ok
    assert "skill:wiki-mem" in first.ok
    assert any(item.startswith("legacy-moved:skill:wiki ->") for item in first.ok)
    assert any(item.startswith("legacy-moved:skill:wiki-mem ->") for item in first.ok)

    assert wiki.is_symlink()
    assert wiki.resolve() == (REPO / ".cursor" / "skills" / "wiki").resolve()
    assert wiki_mem.is_symlink()
    assert wiki_mem.resolve() == (REPO / ".cursor" / "skills" / "wiki-mem").resolve()
    assert not (wiki / MARKER).exists()
    assert not (wiki_mem / MARKER).exists()
    assert not (REPO / ".cursor" / "skills" / "wiki" / MARKER).exists()
    assert not (REPO / ".cursor" / "skills" / "wiki-mem" / MARKER).exists()

    backups = home / ".agent-setup" / "backups"
    wiki_markers = list(backups.rglob(MARKER))
    assert len(wiki_markers) == 2
    bodies = {path.read_text(encoding="utf-8") for path in wiki_markers}
    assert bodies == {"wiki-keep\n", "mem-keep\n"}
    for manifest in backups.rglob("manifest.json"):
        text = manifest.read_text(encoding="utf-8")
        assert '"method": "move"' in text

    second = install(profile="standard")
    assert second.conflicts == []
    assert second.errors == []
    assert "skill:wiki (already configured)" in second.skipped
    assert "skill:wiki-mem (already configured)" in second.skipped
    assert not any(item.startswith("legacy-moved:") for item in second.ok)
    assert list(backups.rglob(MARKER)) == wiki_markers
