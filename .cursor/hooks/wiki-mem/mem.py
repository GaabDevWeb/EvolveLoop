#!/usr/bin/env python3
"""Wiki episodic session memory — store + search (não é o RAG canónico)."""
from __future__ import annotations

import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

VAULT = Path(os.environ.get("WIKI_ROOT") or os.environ.get("RAG_REPO_ROOT") or "")
if not str(VAULT):
    # Fail closed at runtime when used — empty vault path is invalid
    VAULT = Path("")
SESSIONS = VAULT / ".ai" / "sessions"
CURRENT = SESSIONS / "current.json"
LATEST = SESSIONS / "LATEST.md"
INDEX = SESSIONS / "index.jsonl"
PROMOTE = SESSIONS / "promote-queue.md"

SKIP_PATH_RE = re.compile(
    r"(?:^|/)\.env(?:\.|$)|credentials|secrets?|/node_modules/|\.venv/|"
    r"__pycache__|\.git/|id_rsa|\.pem$|\.key$|agents\.env$",
    re.I,
)

# Redaction mínima (hooks não dependem do package rag instalado).
_SECRET_RE = re.compile(
    r"(?i)((?:CURSOR_|OPENAI_|ANTHROPIC_)?API[_-]?KEY|Authorization:\s*Bearer|"
    r"Bearer\s+[A-Za-z0-9\-._~+/]+=*|password\s*[=:]\s*\S+|sk-[A-Za-z0-9]{20,})"
)


def _redact_text(text: str) -> str:
    if not text:
        return text
    return _SECRET_RE.sub("[REDACTED]", text)


def _redact_obj(obj: Any) -> Any:
    if isinstance(obj, str):
        return _redact_text(obj)
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            if str(k).lower().replace("-", "_") in {
                "api_key",
                "cursor_api_key",
                "authorization",
                "password",
                "token",
                "secret",
            }:
                out[k] = "[REDACTED]"
            else:
                out[k] = _redact_obj(v)
        return out
    if isinstance(obj, list):
        return [_redact_obj(x) for x in obj]
    return obj

CODE_EXT_RE = re.compile(
    r"\.(py|ts|tsx|js|jsx|mjs|cjs|go|rs|java|kt|c|cc|cpp|h|hpp|rb|php|"
    r"swift|cs|vue|svelte|sh|bash|zsh|sql|toml)$",
    re.I,
)

PROMOTE_BLOCK_RE = re.compile(
    r"## \[[^\]]+\] promote-queue \| session ([^\n]+)\n(?:.*?)(?=\n## \[|\Z)",
    re.S,
)

MAX_OBS = 80
MAX_LATEST_SESSIONS = 8
MAX_CONTEXT_CHARS = 3500


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def is_code_path(file_path: str) -> bool:
    """True se o path é código de produto — nunca wiki/ nem raw/."""
    if not file_path or SKIP_PATH_RE.search(file_path):
        return False
    norm = file_path.replace("\\", "/")
    if "/wiki/" in norm or "/raw/" in norm or "/.ai/sessions/" in norm:
        return False
    return bool(CODE_EXT_RE.search(file_path))


def collect_code_candidates(data: dict[str, Any]) -> list[str]:
    cands: list[str] = []
    for p in data.get("promote_candidates") or []:
        sp = str(p)
        if sp and is_code_path(sp) and sp not in cands:
            cands.append(sp)
    for o in data.get("observations") or []:
        if o.get("type") not in (None, "file_edit"):
            continue
        p = str(o.get("path") or "")
        if p and is_code_path(p) and p not in cands:
            cands.append(p)
    return cands[:40]


def ensure_dirs() -> None:
    SESSIONS.mkdir(parents=True, exist_ok=True)
    (SESSIONS / _today()).mkdir(parents=True, exist_ok=True)


def session_path(session_id: str, day: str | None = None) -> Path:
    d = day or _today()
    safe = re.sub(r"[^\w.-]+", "_", session_id)[:80] or "unknown"
    return SESSIONS / d / f"{safe}.json"


def load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def save_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    safe = _redact_obj(data)
    path.write_text(json.dumps(safe, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def read_stdin_json() -> dict[str, Any]:
    raw = sys.stdin.read()
    if not raw.strip():
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


def emit(obj: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(obj, ensure_ascii=False))
    sys.stdout.flush()


def start_session(payload: dict[str, Any]) -> dict[str, Any]:
    ensure_dirs()
    sid = str(payload.get("session_id") or payload.get("conversation_id") or f"local-{_now()}")
    cwd = str(payload.get("cwd") or payload.get("workspace_roots") or os.getcwd())
    mode = str(payload.get("composer_mode") or "")
    path = session_path(sid)
    data = {
        "session_id": sid,
        "started_at": _now(),
        "cwd": cwd,
        "composer_mode": mode,
        "is_background_agent": bool(payload.get("is_background_agent")),
        "observations": [],
        "summary": "",
        "promote_candidates": [],
        "status": "open",
    }
    if path.exists():
        existing = load_json(path)
        existing.setdefault("observations", [])
        existing["status"] = "open"
        data = existing
    save_json(path, data)
    save_json(
        CURRENT,
        {"session_id": sid, "path": str(path), "started_at": data.get("started_at"), "cwd": cwd},
    )
    with INDEX.open("a", encoding="utf-8") as f:
        f.write(
            json.dumps(
                {"ts": _now(), "event": "start", "session_id": sid, "path": str(path), "cwd": cwd},
                ensure_ascii=False,
            )
            + "\n"
        )
    digest = build_latest_digest()
    LATEST.write_text(digest, encoding="utf-8")
    ctx = (
        "Wiki episodic memory (não é RAG canónico).\n"
        f"- LATEST: {LATEST}\n"
        f"- current session: {path}\n"
        "- Preferir contratos da wiki/RAG; isto é continuidade de sessão.\n"
        "- Search: python3 ~/.cursor/hooks/wiki-mem/mem.py search \"query\"\n"
        "- Promote: python3 ~/.cursor/hooks/wiki-mem/mem.py promote\n\n"
        + digest[:MAX_CONTEXT_CHARS]
    )
    return {
        "env": {
            "WIKI_SESSION_ID": sid,
            "WIKI_SESSION_PATH": str(path),
            "WIKI_MEM_LATEST": str(LATEST),
            "RAG_REPO_ROOT": str(VAULT),
        },
        "additional_context": ctx,
    }


def append_edit(payload: dict[str, Any]) -> dict[str, Any]:
    ensure_dirs()
    cur = load_json(CURRENT)
    path = Path(cur["path"]) if cur.get("path") else None
    if not path or not path.exists():
        # lazy-open session
        sid = os.environ.get("WIKI_SESSION_ID") or f"edit-{_now()}"
        start_session({"session_id": sid, "cwd": os.getcwd()})
        cur = load_json(CURRENT)
        path = Path(cur["path"])
    data = load_json(path)
    file_path = str(payload.get("file_path") or payload.get("path") or "")
    if not file_path or SKIP_PATH_RE.search(file_path):
        return {}
    edits = payload.get("edits") or []
    n = len(edits) if isinstance(edits, list) else 1
    obs = {
        "ts": _now(),
        "type": "file_edit",
        "path": file_path,
        "edit_count": n,
    }
    observations = list(data.get("observations") or [])
    # dedupe consecutive same path
    if observations and observations[-1].get("path") == file_path:
        observations[-1]["edit_count"] = int(observations[-1].get("edit_count") or 0) + n
        observations[-1]["ts"] = obs["ts"]
    else:
        observations.append(obs)
    data["observations"] = observations[-MAX_OBS:]
    if is_code_path(file_path):
        cands = list(data.get("promote_candidates") or [])
        if file_path not in cands:
            cands.append(file_path)
        data["promote_candidates"] = cands[-40:]
    save_json(path, data)
    return {}


def finalize_session(payload: dict[str, Any], reason: str = "stop") -> dict[str, Any]:
    ensure_dirs()
    cur = load_json(CURRENT)
    path = Path(cur["path"]) if cur.get("path") else None
    if not path or not path.exists():
        return {}
    data = load_json(path)
    obs = data.get("observations") or []
    paths = []
    for o in obs:
        p = o.get("path")
        if p and p not in paths:
            paths.append(p)
    summary_lines = [
        f"Session {data.get('session_id')} ({reason})",
        f"cwd: {data.get('cwd')}",
        f"files_touched: {len(paths)}",
    ]
    if paths:
        summary_lines.append("top_files:")
        for p in paths[:12]:
            summary_lines.append(f"  - {p}")
    cands = collect_code_candidates(data)
    if cands:
        summary_lines.append("promote_candidates:")
        for p in cands[:10]:
            summary_lines.append(f"  - {p}")
    data["summary"] = "\n".join(summary_lines)
    data["ended_at"] = _now()
    data["status"] = reason
    data["stop_status"] = payload.get("status") or payload.get("reason") or reason
    save_json(path, data)
    with INDEX.open("a", encoding="utf-8") as f:
        f.write(
            json.dumps(
                {
                    "ts": _now(),
                    "event": "end",
                    "session_id": data.get("session_id"),
                    "path": str(path),
                    "files": len(paths),
                    "reason": reason,
                },
                ensure_ascii=False,
            )
            + "\n"
        )
    LATEST.write_text(build_latest_digest(), encoding="utf-8")
    enqueue_promote_queue(data)
    return {}


def iter_sessions() -> list[Path]:
    if not SESSIONS.exists():
        return []
    files = sorted(SESSIONS.glob("*/*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    return [p for p in files if p.name != "current.json"]


def build_latest_digest() -> str:
    lines = [
        "# Wiki episodic memory — LATEST",
        "",
        f"Gerado: {_now()}",
        f"Vault: `{VAULT}`",
        "",
        "Camada **episódica** (sessões Cursor). Contratos canónicos: wiki + RAG.",
        "",
    ]
    for path in iter_sessions()[:MAX_LATEST_SESSIONS]:
        data = load_json(path)
        lines.append(f"## {data.get('session_id', path.stem)}")
        lines.append(f"- started: {data.get('started_at', '?')}")
        lines.append(f"- status: {data.get('status', '?')}")
        lines.append(f"- cwd: `{data.get('cwd', '')}`")
        summary = (data.get("summary") or "").strip()
        if summary:
            lines.append("```")
            lines.append(summary[:800])
            lines.append("```")
        else:
            obs = data.get("observations") or []
            lines.append(f"- observations: {len(obs)}")
            for o in obs[-5:]:
                lines.append(f"  - {o.get('type')}: `{o.get('path')}`")
        lines.append("")
    return "\n".join(lines) + "\n"


def search(query: str, limit: int = 12) -> str:
    ensure_dirs()
    q = query.lower().strip()
    if not q:
        return "Uso: mem.py search \"query\""
    hits: list[tuple[float, str]] = []
    terms = [t for t in re.split(r"\s+", q) if t]
    for path in iter_sessions()[:60]:
        text = path.read_text(encoding="utf-8", errors="ignore")
        low = text.lower()
        score = sum(low.count(t) for t in terms)
        if score <= 0:
            continue
        data = load_json(path)
        snippet = (data.get("summary") or "")[:240] or ", ".join(
            (o.get("path") or "") for o in (data.get("observations") or [])[-3:]
        )
        hits.append((score, f"[{score}] {path.name} — {snippet}"))
    hits.sort(key=lambda x: (-x[0], x[1]))
    if not hits:
        return f"Sem hits para: {query}\n(Consulte também LATEST.md e o RAG canónico.)"
    out = [f"# mem search: {query}", ""]
    for _, line in hits[:limit]:
        out.append(f"- {line}")
    out.append("")
    out.append(f"LATEST: {LATEST}")
    return "\n".join(out)


def _promote_block(session_id: str, cands: list[str]) -> str:
    block = [
        f"## [{_today()}] promote-queue | session {session_id}",
        "",
        "Candidatos a registo na wiki canónica (`{Projeto}/log.md` ± `wiki/`):",
        "",
    ]
    for p in cands[:20]:
        block.append(f"- `{p}`")
    block.append("")
    block.append(
        "Acção: hook só enfileira. librarian/Agent append em log.md do projeto; "
        "só actualizar wiki/ se contratos/estado mudaram. Não tocar raw/."
    )
    block.append("")
    return "\n".join(block)


def enqueue_promote_queue(data: dict[str, Any]) -> str:
    """Append/refresh promote-queue.md. Nunca escreve wiki/ nem raw/."""
    ensure_dirs()
    cands = collect_code_candidates(data)
    if not cands:
        return ""
    sid = str(data.get("session_id") or "?")
    text = _promote_block(sid, cands)
    existing = PROMOTE.read_text(encoding="utf-8") if PROMOTE.exists() else ""
    replaced = False
    pieces: list[str] = []
    last = 0
    for m in PROMOTE_BLOCK_RE.finditer(existing):
        pieces.append(existing[last : m.start()])
        if m.group(1).strip() == sid:
            pieces.append(text)
            replaced = True
        else:
            pieces.append(m.group(0))
        last = m.end()
    pieces.append(existing[last:])
    new_body = "".join(pieces)
    if not replaced:
        prefix = new_body.rstrip()
        new_body = (prefix + "\n\n" if prefix else "") + text
    PROMOTE.write_text(new_body.rstrip() + "\n", encoding="utf-8")
    return text


def promote_draft() -> str:
    """Escreve fila de promoção — não altera wiki/ canónica automaticamente."""
    ensure_dirs()
    cur = load_json(CURRENT)
    path = Path(cur["path"]) if cur.get("path") else None
    data = load_json(path) if path and path.exists() else {}
    text = enqueue_promote_queue(data)
    if not text:
        return "Nada para promover (sem file edits de código nesta sessão)."
    return text


def main() -> None:
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"
    if cmd == "session-start":
        emit(start_session(read_stdin_json()))
    elif cmd == "after-edit":
        emit(append_edit(read_stdin_json()))
    elif cmd == "session-end":
        emit(finalize_session(read_stdin_json(), reason="session_end"))
    elif cmd == "stop":
        emit(finalize_session(read_stdin_json(), reason="stop"))
    elif cmd == "search":
        q = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else ""
        print(search(q))
    elif cmd == "promote":
        print(promote_draft())
    elif cmd == "digest":
        ensure_dirs()
        d = build_latest_digest()
        LATEST.write_text(d, encoding="utf-8")
        print(d)
    else:
        print(
            "cmds: session-start | after-edit | stop | session-end | search | promote | digest",
            file=sys.stderr,
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
