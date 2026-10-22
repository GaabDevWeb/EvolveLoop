from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

VAULT = Path(__file__).resolve().parents[1]
REPO = VAULT.parents[1]


@pytest.fixture(scope="module")
def vault_env(tmp_path_factory):
    import shutil

    work = tmp_path_factory.mktemp("vault")
    shutil.copytree(VAULT / "gaabwiki", work / "gaabwiki")
    shutil.copy2(VAULT / "pyproject.toml", work / "pyproject.toml")
    (work / "projects" / "evolveloop" / "pages").mkdir(parents=True)
    page = work / "projects" / "evolveloop" / "pages" / "sample.md"
    page.write_text(
        """---
title: sample
status: atual
source_paths:
  - profiles/default.yaml
keywords: memory enabled false
---
Profile memory disabled.
""",
        encoding="utf-8",
    )
    env = {
        **dict(__import__("os").environ),
        "WIKI_ROOT": str(work),
        "EVOLVELOOP_MONOREPO_ROOT": str(REPO),
    }
    subprocess.check_call(
        [sys.executable, "-m", "pip", "install", "-q", "-e", str(work)],
        cwd=work,
    )
    subprocess.check_call([sys.executable, "-m", "gaabwiki", "rebuild"], cwd=work, env=env)
    return work, env


def test_search_returns_provenance(vault_env):
    work, env = vault_env
    out = subprocess.check_output(
        [sys.executable, "-m", "gaabwiki", "search", "memory enabled", "--json"],
        cwd=work,
        env=env,
        text=True,
    )
    data = json.loads(out)
    assert data["status"] in ("ok", "no_hits")
    if data.get("selected"):
        src = data["selected"][0]["source"]
        assert "file" in src
        assert "line" in src


def test_stale_after_source_change(vault_env):
    work, env = vault_env
    prof = REPO / "profiles" / "default.yaml"
    original = prof.read_text(encoding="utf-8")
    subprocess.check_call([sys.executable, "-m", "gaabwiki", "rebuild"], cwd=work, env=env)
    prof.write_text(original + "\n# stale-test-marker\n", encoding="utf-8")
    out = subprocess.check_output(
        [sys.executable, "-m", "gaabwiki", "search", "memory", "--json"],
        cwd=work,
        env=env,
        text=True,
    )
    data = json.loads(out)
    stale = [h for h in data.get("selected") or [] if h.get("source", {}).get("stale")]
    assert stale, "expected stale hit after source mutation"
    prof.write_text(original, encoding="utf-8")
