from pathlib import Path

from agent_setup.install import _copy_or_link


def test_copy_or_link_skips_when_source_equals_destination(tmp_path: Path):
    same = tmp_path / "orquestrar"
    same.mkdir()
    state: dict = {}
    status = _copy_or_link(same, same, symlink=True, force=False, component="skill:test", state=state)
    assert status == "skipped"
