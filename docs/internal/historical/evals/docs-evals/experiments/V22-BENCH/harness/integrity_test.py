#!/usr/bin/env python3
"""Integrity tests for V22-BENCH harness."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from official_manifest import (  # noqa: E402
    TASKS_FROZEN,
    sha256_file,
    validate_b1_no_task_rg_leak,
    validate_manifest,
    validate_raw_matches_summary,
)
from bench_harness import (  # noqa: E402
    EXP_DIR,
    FIXTURE_SRC,
    REPO_ROOT,
    load_tasks,
    run_battery,
    simulate_arm,
    copy_fixture,
    load_tokenizer,
)


def test_fixture_present():
    assert FIXTURE_SRC.is_dir()
    assert (FIXTURE_SRC / "src/alpha/core.py").is_file()
    assert (FIXTURE_SRC / ".ai/index.md").is_file()


def test_b1_fewer_paths_than_b0_on_s02():
    tasks = load_tasks()
    s02 = next(s for s in tasks["scenarios"] if s["id"] == "S02")
    _, counter = load_tokenizer()
    import tempfile

    with tempfile.TemporaryDirectory() as td:
        from pathlib import Path

        proj_b0 = copy_fixture(Path(td) / "b0", include_wiki=False)
        proj_b1 = copy_fixture(Path(td) / "b1", include_wiki=True)
        m0 = simulate_arm("B0", s02, proj_b0, counter)
        m1 = simulate_arm("B1", s02, proj_b1, counter)
        assert m0.verifier_pass and m1.verifier_pass
        assert len(m1.paths_read) < len(m0.paths_read)


def test_secret_not_read():
    tasks = load_tasks()
    s01 = next(s for s in tasks["scenarios"] if s["id"] == "S01")
    _, counter = load_tokenizer()
    import tempfile
    from pathlib import Path

    with tempfile.TemporaryDirectory() as td:
        proj = copy_fixture(Path(td) / "p", include_wiki=False)
        m = simulate_arm("B0", s01, proj, counter)
        assert not m.secret_leak
        assert "secrets/decoy.env" not in m.paths_read


def test_battery_writes_json(tmp_path: Path | None = None):
    out = EXP_DIR / "raw" / "battery"
    summary = out / "battery-summary.json"
    if summary.is_file():
        data = json.loads(summary.read_text(encoding="utf-8"))
        assert data.get("experiment") == "V22-BENCH"
        assert data.get("classification") == "PROVISIONAL_SYNTHETIC"
        assert data.get("aggregates")


def test_real_battery_classifications():
    out = EXP_DIR / "raw" / "battery-real" / "battery-summary.json"
    assert out.is_file(), "run real_corpus_harness.py first"
    data = json.loads(out.read_text(encoding="utf-8"))
    by_arm = data.get("classification_by_arm") or {}
    assert by_arm.get("B0") == "OFFICIAL_BASELINE"
    assert by_arm.get("B1") == "PROVISIONAL_CURATED_PACK"


def test_official_manifest(manifest_path: Path):
    ok, errs = validate_manifest(manifest_path)
    if not ok:
        raise AssertionError("; ".join(errs))
    print("OK official_manifest")


def test_tasks_frozen_hash_stable():
    assert TASKS_FROZEN.is_file()
    digest = sha256_file(TASKS_FROZEN)
    assert len(digest) == 64
    print(f"OK tasks_frozen_sha256={digest[:12]}...")


def test_b1_harness_no_rg_leak():
    errs = validate_b1_no_task_rg_leak()
    assert not errs, errs
    print("OK b1_no_rg_patterns")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--official",
        help="Path to OFFICIAL-MANIFEST.json (runs official checks only)",
    )
    args = ap.parse_args()
    if args.official:
        test_tasks_frozen_hash_stable()
        test_b1_harness_no_rg_leak()
        test_official_manifest(Path(args.official))
        print("ALL_OFFICIAL_INTEGRITY_OK")
        return

    test_fixture_present()
    print("OK fixture")
    test_b1_fewer_paths_than_b0_on_s02()
    print("OK b1_vs_b0_paths")
    test_secret_not_read()
    print("OK secret_canary")
    test_battery_writes_json()
    print("OK battery_artifact_optional")
    test_real_battery_classifications()
    print("OK real_classifications")
    test_tasks_frozen_hash_stable()
    test_b1_harness_no_rg_leak()
    print("ALL_INTEGRITY_OK")


if __name__ == "__main__":
    main()
