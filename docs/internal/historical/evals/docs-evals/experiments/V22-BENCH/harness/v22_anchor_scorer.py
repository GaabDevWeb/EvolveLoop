#!/usr/bin/env python3
"""Canonical held-out recall scorer (versioned). Independent of retrieval arm."""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Literal

SCORER_VERSION = "v22-anchor-scorer-1.0.0"
ScorerMode = Literal["file_evidence", "line_strict", "path_only"]


def scorer_mode() -> ScorerMode:
    raw = os.environ.get("V22_ANCHOR_SCORER_MODE", "file_evidence").strip().lower()
    if raw in ("file", "file_evidence"):
        return "file_evidence"
    if raw in ("line", "line_strict"):
        return "line_strict"
    if raw in ("path", "path_only"):
        return "path_only"
    return "file_evidence"


def legacy_anchor_recall_env() -> ScorerMode | None:
    """Map deprecated V22_ANCHOR_RECALL=file|line."""
    leg = os.environ.get("V22_ANCHOR_RECALL", "").strip().lower()
    if leg == "file":
        return "file_evidence"
    if leg == "line":
        return "line_strict"
    return None


def effective_scorer_mode() -> ScorerMode:
    leg = legacy_anchor_recall_env()
    return leg if leg is not None else scorer_mode()


def score_anchors(
    repo_root: Path,
    paths_read: list[str],
    anchors: list[dict[str, Any]],
    mode: ScorerMode | None = None,
) -> tuple[float, list[str]]:
    """Return recall in [0,1] and diagnostic notes."""
    m = mode or effective_scorer_mode()
    notes: list[str] = []
    hit = 0
    for a in anchors:
        rel = a["path"]
        line_no = int(a.get("line") or 0)
        sub = str(a.get("substring") or "")
        if rel not in paths_read:
            notes.append(f"miss path not read: {rel}")
            continue
        if m == "path_only":
            hit += 1
            continue
        fp = repo_root / rel
        if not fp.is_file():
            notes.append(f"miss file missing: {rel}")
            continue
        text = fp.read_text(encoding="utf-8", errors="replace")
        lines = text.splitlines()
        line_ok = (
            line_no >= 1
            and line_no <= len(lines)
            and sub
            and sub in lines[line_no - 1]
        )
        file_ok = bool(sub and sub in text)
        if m == "line_strict":
            if line_ok:
                hit += 1
            else:
                notes.append(f"miss substring @ {rel}:{line_no}")
        elif line_ok:
            hit += 1
        elif file_ok:
            hit += 1
            notes.append(f"anchor line drift (file evidence): {rel}:{line_no}")
        else:
            notes.append(f"miss evidence in file: {rel}")
    total = len(anchors) or 1
    return hit / total, notes


def rescore_run_metrics(
    repo_root: Path,
    paths_read: list[str],
    anchors: list[dict[str, Any]],
) -> dict[str, Any]:
    recall, notes = score_anchors(repo_root, paths_read, anchors)
    return {
        "scorer_version": SCORER_VERSION,
        "scorer_mode": effective_scorer_mode(),
        "recall": recall,
        "recall_notes": notes,
        "verifier_pass": recall >= 1.0,
    }
