from __future__ import annotations

import argparse
import json
import sys

from agent_setup import __version__
from agent_setup.detect import detect
from agent_setup.diff import diff
from agent_setup.doctor import doctor
from agent_setup.init_project import init_project
from agent_setup.install import install, uninstall
from agent_setup.manifest import read_version
from agent_setup.state import load_state


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="agent", description="Agent Setup — reproducible AI dev environment")
    parser.add_argument("--json", action="store_true", help="JSON output")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("version", help="Show version")

    p_install = sub.add_parser("install", help="Install managed components")
    p_install.add_argument("--profile", default="standard", choices=["minimal", "standard", "full"])
    p_install.add_argument("--force", action="store_true")
    p_install.add_argument("--dry-run", action="store_true")

    sub.add_parser("update", help="Update managed components (alias install)")
    sub.add_parser("uninstall", help="Remove managed components")
    sub.add_parser("doctor", help="Environment diagnostics")
    sub.add_parser("status", help="Short status summary")
    sub.add_parser("detect", help="Detect system capabilities")

    p_diff = sub.add_parser("diff", help="Compare desired vs actual state")
    p_diff.add_argument("--profile", default="standard")

    p_init = sub.add_parser("init", help="Initialize project AI layer")
    p_init.add_argument("--rag", action="store_true", help="Enable RAG hints")
    p_init.add_argument("path", nargs="?", default=".")

    args = parser.parse_args(argv)

    if args.command == "version":
        print(read_version())
        return 0

    if args.command == "detect":
        result = detect().to_dict()
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            print(json.dumps(result, indent=2))
        return 0

    if args.command == "install":
        result = install(profile=args.profile, force=args.force, dry_run=args.dry_run)
        return _print_install_result(result, args.json)

    if args.command == "update":
        state = load_state()
        profile = state.get("profile", "standard")
        result = install(profile=profile, force=False)
        return _print_install_result(result, args.json)

    if args.command == "uninstall":
        result = uninstall()
        return _print_install_result(result, args.json)

    if args.command == "doctor":
        report = doctor()
        print(report.render())
        return 0 if report.status != "broken" else 1

    if args.command == "status":
        state = load_state()
        det = detect()
        print(f"Agent Setup {read_version()}")
        print(f"Profile: {state.get('profile', 'not installed')}")
        print(f"OS: {det.distribution} | Python {det.python.get('version')} | Cursor {det.cursor.get('installed')}")
        return 0

    if args.command == "diff":
        report = diff(profile=args.profile)
        print(report.render())
        return 0

    if args.command == "init":
        from pathlib import Path

        out = init_project(Path(args.path), enable_rag=args.rag)
        if args.json:
            print(json.dumps(out, indent=2))
        else:
            print(json.dumps(out, indent=2))
        return 0

    return 1


def _print_install_result(result, as_json: bool) -> int:
    payload = {
        "ok": result.ok,
        "skipped": result.skipped,
        "conflicts": result.conflicts,
        "errors": result.errors,
    }
    if as_json:
        print(json.dumps(payload, indent=2))
    else:
        for item in result.ok:
            print(f"✓ {item}")
        for item in result.skipped:
            print(f"· {item}")
        for item in result.conflicts:
            print(f"⚠ CONFLICT {item}")
        for item in result.errors:
            print(f"✗ {item}")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
