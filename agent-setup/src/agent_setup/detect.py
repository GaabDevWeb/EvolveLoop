from __future__ import annotations

import hashlib
import json
import os
import platform
import shutil
import subprocess
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class DetectionResult:
    os: str = "unknown"
    distribution: str = "unknown"
    architecture: str = "unknown"
    shell: str = "unknown"
    git: dict[str, Any] = field(default_factory=dict)
    python: dict[str, Any] = field(default_factory=dict)
    node: dict[str, Any] = field(default_factory=dict)
    cursor: dict[str, Any] = field(default_factory=dict)
    systemd_user: dict[str, Any] = field(default_factory=dict)
    ollama: dict[str, Any] = field(default_factory=dict)
    docker: dict[str, Any] = field(default_factory=dict)
    ssh: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _which(name: str) -> str | None:
    return shutil.which(name)


def _run_version(cmd: list[str]) -> str | None:
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=5, check=False)
        if out.returncode == 0:
            return out.stdout.strip().splitlines()[0] if out.stdout.strip() else None
    except (OSError, subprocess.TimeoutExpired):
        pass
    return None


def _read_os_release() -> str:
    try:
        for line in Path("/etc/os-release").read_text(encoding="utf-8").splitlines():
            if line.startswith("ID="):
                return line.split("=", 1)[1].strip().strip('"')
    except OSError:
        pass
    return "unknown"


def _probe_ollama() -> bool:
    import urllib.error
    import urllib.request

    url = os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/") + "/api/tags"
    try:
        with urllib.request.urlopen(url, timeout=3) as resp:
            return resp.status == 200
    except (urllib.error.URLError, TimeoutError, OSError):
        return False


def detect() -> DetectionResult:
    result = DetectionResult()
    result.os = sys.platform
    result.distribution = _read_os_release()
    result.architecture = platform.machine()
    result.shell = Path(os.environ.get("SHELL", "")).name if "SHELL" in os.environ else "unknown"

    git_path = _which("git")
    result.git = {
        "installed": git_path is not None,
        "path": git_path,
        "version": _run_version(["git", "--version"]) if git_path else None,
    }

    result.python = {
        "installed": True,
        "version": platform.python_version(),
        "executable": sys.executable,
    }

    node_path = _which("node")
    result.node = {
        "installed": node_path is not None,
        "path": node_path,
        "version": _run_version(["node", "--version"]) if node_path else None,
    }

    cursor_path = _which("cursor")
    result.cursor = {
        "installed": cursor_path is not None or Path.home().joinpath(".cursor").is_dir(),
        "path": cursor_path,
    }

    systemd_ok = False
    if _which("systemctl"):
        try:
            proc = subprocess.run(
                ["systemctl", "--user", "is-system-running"],
                capture_output=True,
                text=True,
                timeout=5,
                check=False,
            )
            systemd_ok = proc.returncode in (0, 1)
        except (OSError, subprocess.TimeoutExpired):
            pass
    result.systemd_user = {"available": systemd_ok}

    ollama_path = _which("ollama")
    result.ollama = {
        "installed": ollama_path is not None,
        "path": ollama_path,
        "reachable": _probe_ollama(),
    }

    docker_path = _which("docker")
    result.docker = {"installed": docker_path is not None, "path": docker_path}

    ssh_path = _which("ssh")
    result.ssh = {"installed": ssh_path is not None, "path": ssh_path}

    return result
