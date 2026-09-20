#!/usr/bin/env python3
"""Integrity tests for E-001 harness — not the full experiment battery."""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from catalog_harness import (  # noqa: E402
    DEFAULT_SEED,
    SKILLS_ROOT,
    ROOT,
    assert_determinism,
    fingerprint,
    load_catalog,
    materialize_prefix,
    run_enablement_dry,
    select_prefix,
    seeded_order,
)


def test_determinism():
    assert_determinism()
    skills = load_catalog()
    ids = [s["skill_id"] for s in skills]
    for _ in range(3):
        assert select_prefix(ids, DEFAULT_SEED, 5) == select_prefix(ids, DEFAULT_SEED, 5)


def test_conditions_differ():
    skills = load_catalog()
    ids = [s["skill_id"] for s in skills]
    c = select_prefix(ids, DEFAULT_SEED, None)
    t5 = select_prefix(ids, DEFAULT_SEED, 5)
    t10 = select_prefix(ids, DEFAULT_SEED, 10)
    assert len(c) == len(ids)
    assert len(t5) == 5
    assert len(t10) == 10
    assert fingerprint(c) != fingerprint(t5)
    assert fingerprint(t5) != fingerprint(t10)
    by_id = {s["skill_id"]: s for s in skills}
    _, tok_full = materialize_prefix(by_id, c, None)
    _, tok_trunc = materialize_prefix(by_id, c, 40)
    assert tok_trunc < tok_full


def test_isolation_source_skills():
    """Harness must not modify .cursor/skills content."""
    before = {}
    for p in sorted(SKILLS_ROOT.rglob("SKILL.md")):
        before[str(p.relative_to(ROOT))] = hashlib.sha256(p.read_bytes()).hexdigest()
    run_enablement_dry(Path(__file__).resolve().parents[1] / "raw" / "enablement")
    after = {}
    for p in sorted(SKILLS_ROOT.rglob("SKILL.md")):
        after[str(p.relative_to(ROOT))] = hashlib.sha256(p.read_bytes()).hexdigest()
    assert before == after, "source Skills were modified"


def test_seeded_order_stable():
    skills = load_catalog()
    ids = [s["skill_id"] for s in skills]
    assert seeded_order(ids, DEFAULT_SEED) == seeded_order(ids, DEFAULT_SEED)
    assert seeded_order(ids, DEFAULT_SEED) != seeded_order(ids, "other-seed")


def main():
    test_determinism()
    print("OK determinism")
    test_conditions_differ()
    print("OK conditions_differ")
    test_seeded_order_stable()
    print("OK seeded_order")
    test_isolation_source_skills()
    print("OK isolation")
    print("ALL_INTEGRITY_OK")


if __name__ == "__main__":
    main()
