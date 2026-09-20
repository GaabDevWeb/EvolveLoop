import pytest

from agent_setup.manifest import ManifestBundle, read_version


def test_read_version():
    assert read_version().count(".") >= 1


def test_manifest_load():
    bundle = ManifestBundle.load()
    assert str(bundle.manifest.get("version")) == "1"
    assert "standard" in bundle.profiles.get("profiles", {})


def test_profile_merge():
    bundle = ManifestBundle.load()
    std = bundle.profile_components("standard")
    assert "wiki" in std["components"].get("skills", [])
    full = bundle.profile_components("full")
    assert full["components"].get("rag") is True
