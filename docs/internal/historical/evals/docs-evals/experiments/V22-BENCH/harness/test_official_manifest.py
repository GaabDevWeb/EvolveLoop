"""pytest: OFFICIAL_WIKI_GROUND manifest validation."""
from __future__ import annotations

from pathlib import Path

import pytest

from official_manifest import validate_manifest

MANIFEST = (
    Path(__file__).resolve().parents[1]
    / "raw"
    / "battery-held-out-official-hybrid"
    / "OFFICIAL-MANIFEST.json"
)


@pytest.mark.skipif(not MANIFEST.is_file(), reason="official bench not run yet")
def test_official_manifest_valid():
    ok, errs = validate_manifest(MANIFEST)
    assert ok, errs
