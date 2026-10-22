"""Unit tests for canonical held-out anchor scorer."""
from __future__ import annotations

import os
from pathlib import Path

import pytest

import subprocess

from v22_anchor_scorer import SCORER_VERSION, score_anchors

HARNESS = Path(__file__).resolve().parent
REPO = Path(
    subprocess.check_output(
        ["git", "rev-parse", "--show-toplevel"], cwd=HARNESS, text=True
    ).strip()
)


def test_scorer_version_pinned() -> None:
    assert SCORER_VERSION == "v22-anchor-scorer-1.0.0"


def test_file_evidence_path_only_miss() -> None:
    anchors = [
        {
            "path": "orchestrator/src/knowledge/backend/wiki-backend.ts",
            "line": 183,
            "substring": "wiki-backend",
        }
    ]
    recall, notes = score_anchors(REPO, [], anchors, mode="file_evidence")
    assert recall == 0.0
    assert any("miss path not read" in n for n in notes)


def test_file_evidence_hits_when_path_read() -> None:
    rel = "orchestrator/src/knowledge/backend/wiki-backend.ts"
    anchors = [{"path": rel, "line": 1, "substring": "export"}]
    recall, _ = score_anchors(REPO, [rel], anchors, mode="file_evidence")
    assert recall == 1.0


def test_legacy_env_maps_file(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("V22_ANCHOR_SCORER_MODE", raising=False)
    monkeypatch.setenv("V22_ANCHOR_RECALL", "file")
    from v22_anchor_scorer import effective_scorer_mode

    assert effective_scorer_mode() == "file_evidence"
