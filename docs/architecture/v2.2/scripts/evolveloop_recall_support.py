"""Corpus-side recall helpers (ingest enrichment, glossary, query expansion). No V22-BENCH tasks."""
from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

BENCH_BLOCK = "docs/internal/historical/evals/docs-evals/experiments/V22-BENCH"
CORPUS_ROOTS = (
    "docs",
    "orchestrator/src",
    "profiles",
    ".cursor/skills",
)
ALLOWED_SUFFIXES = {
    ".md",
    ".yaml",
    ".yml",
    ".ts",
    ".tsx",
    ".py",
    ".json",
    ".sh",
}
SKIP_DIR_NAMES = {
    "node_modules",
    ".git",
    "dist",
    ".venv",
    "__pycache__",
    "raw",
}
MAX_FILES = 2000

SYMBOL_PATTERNS = (
    re.compile(r"\bexport\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)"),
    re.compile(r"\bexport\s+const\s+([A-Za-z_$][\w$]*)"),
    re.compile(r"\bexport\s+class\s+([A-Za-z_$][\w$]*)"),
    re.compile(r"\b(?:readonly|const)\s+([A-Z][A-Z0-9_]{2,})\b"),
    re.compile(r"\bADR-\d{4}\b", re.I),
    re.compile(r"/[a-z][a-z0-9-]+(?:/[a-z][a-z0-9-]+)*", re.I),
)
HEADING_RE = re.compile(r"^#{1,6}\s+(.+)$", re.MULTILINE)
IDENT_RE = re.compile(r"\b[A-Za-z_][A-Za-z0-9_./-]{2,}\b")
PT_WORD_RE = re.compile(r"\b[a-záàâãéêíóôõúç]{4,}\b", re.I)
CAMEL_RE = re.compile(r"\b[A-Z][a-zA-Z0-9]+(?:[A-Z][a-zA-Z0-9]+)+\b")
ADR_RE = re.compile(r"\bADR-\d{4}\b", re.I)
PATH_LIKE_RE = re.compile(r"\b[a-z][a-z0-9]+(?:-[a-z0-9]+)+(?:\.[a-z]+)?\b", re.I)


def repo_root(explicit: str | None) -> Path:
    if explicit:
        return Path(explicit).resolve()
    out = subprocess.check_output(
        ["git", "rev-parse", "--show-toplevel"],
        text=True,
    )
    return Path(out.strip()).resolve()


def should_skip(path: Path, repo: Path) -> bool:
    rel = path.relative_to(repo).as_posix()
    if BENCH_BLOCK in rel or "/V22-BENCH/" in rel:
        return True
    if "docs/internal/historical/evals" in rel:
        return True
    if set(path.parts) & SKIP_DIR_NAMES:
        return True
    return path.suffix.lower() not in ALLOWED_SUFFIXES


def collect_corpus_files(repo: Path) -> list[Path]:
    found: list[Path] = []
    for root_name in CORPUS_ROOTS:
        base = repo / root_name
        if not base.exists():
            continue
        for p in sorted(base.rglob("*")):
            if not p.is_file():
                continue
            if should_skip(p, repo):
                continue
            found.append(p)
            if len(found) >= MAX_FILES:
                return found
    return found


def extract_symbols(text: str, limit: int = 60) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for pat in SYMBOL_PATTERNS:
        for m in pat.finditer(text):
            s = m.group(1) if m.lastindex else m.group(0)
            if s in seen:
                continue
            seen.add(s)
            out.append(s)
            if len(out) >= limit:
                return out
    return out


def extract_headings(text: str, limit: int = 40) -> list[str]:
    out: list[str] = []
    for m in HEADING_RE.finditer(text):
        h = m.group(1).strip()
        if h and h not in out:
            out.append(h)
        if len(out) >= limit:
            break
    return out


def path_index_tokens(rel: str) -> list[str]:
    parts = re.split(r"[/._-]+", rel)
    return [p for p in parts if len(p) >= 2]


def build_index_preamble(rel: str, body: str) -> str:
    """Searchable block prepended to ingested wiki pages (path, headings, symbols)."""
    headings = extract_headings(body)
    symbols = extract_symbols(body)
    path_toks = path_index_tokens(rel)
    lines = [
        "<!-- evolveloop-index-block -->",
        f"repository_path: {rel}",
        f"path_tokens: {' '.join(path_toks)}",
    ]
    if symbols:
        lines.append(f"symbols: {' '.join(symbols[:50])}")
    if headings:
        lines.append("headings:")
        for h in headings[:25]:
            lines.append(f"  - {h}")
    lines.append("---")
    return "\n".join(lines) + "\n\n"


def derive_pt_en_from_line(line: str) -> list[tuple[str, str]]:
    if not re.search(r"[áàâãéêíóôõúç]", line, re.I):
        return []
    pairs: list[tuple[str, str]] = []
    ids = CAMEL_RE.findall(line) + ADR_RE.findall(line)
    if not ids:
        return []
    for w in PT_WORD_RE.findall(line):
        low = w.lower()
        if low in {"para", "como", "qual", "onde", "deve", "este", "essa", "isso", "apenas"}:
            continue
        for ident in ids:
            pairs.append((low, ident))
    return pairs


def build_glossary(repo: Path) -> dict:
    pt_to_en: dict[str, set[str]] = {}
    identifiers: set[str] = set()
    path_tokens: set[str] = set()

    for fp in collect_corpus_files(repo):
        rel = fp.relative_to(repo).as_posix()
        for t in path_index_tokens(rel):
            path_tokens.add(t)
        try:
            text = fp.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        for sym in extract_symbols(text, limit=200):
            identifiers.add(sym)
        for line in text.splitlines():
            for pt, en in derive_pt_en_from_line(line):
                pt_to_en.setdefault(pt, set()).add(en)
            for ident in IDENT_RE.findall(line):
                if len(ident) >= 4 and (ident[0].isupper() or "-" in ident or "/" in ident):
                    identifiers.add(ident)

    glossary = {
        "schema": "evolveloop-query-glossary-v1",
        "source": "corpus_allowlist_no_v22_bench",
        "pt_to_en": {k: sorted(v)[:12] for k, v in sorted(pt_to_en.items())},
        "identifiers_sample": sorted(identifiers)[:500],
        "path_tokens_sample": sorted(path_tokens)[:300],
    }
    return glossary


def load_glossary(path: Path) -> dict:
    if not path.is_file():
        return {"pt_to_en": {}, "identifiers_sample": [], "path_tokens_sample": []}
    return json.loads(path.read_text(encoding="utf-8"))


def expand_query(query: str, glossary: dict) -> str:
    """Append corpus-derived EN tokens for PT terms and explicit identifiers in the query."""
    extra: list[str] = []
    pt_map = glossary.get("pt_to_en") or {}
    q_low = query.lower()
    for pt, ens in pt_map.items():
        if pt in q_low:
            extra.extend(ens[:4])
    for m in ADR_RE.finditer(query):
        extra.append(m.group(0))
    for m in CAMEL_RE.findall(query):
        extra.append(m)
    for m in PATH_LIKE_RE.findall(query):
        if len(m) >= 5:
            extra.append(m)
    # Backtick-style paths mentioned in NL
    for m in re.findall(r"[\w./-]+\.(?:ts|md|yaml|yml|json)", query, re.I):
        base = m.split("/")[-1]
        extra.append(base)
        stem = re.sub(r"\.[a-z]+$", "", base, flags=re.I)
        if stem and stem != base:
            extra.append(stem)
    if not extra:
        return query
    seen: set[str] = set()
    uniq: list[str] = []
    for t in extra:
        if t.lower() in seen:
            continue
        seen.add(t.lower())
        uniq.append(t)
    return query + " " + " ".join(uniq[:20])


def lexical_rg_patterns(query: str, glossary: dict, max_patterns: int = 4) -> list[str]:
    """Generic lexical patterns from NL query + glossary (not task rg_patterns)."""
    expanded = expand_query(query, glossary)
    patterns: list[str] = []
    seen: set[str] = set()
    for m in ADR_RE.findall(expanded):
        if m not in seen:
            seen.add(m)
            patterns.append(m)
    for m in CAMEL_RE.findall(expanded):
        if m not in seen:
            seen.add(m)
            patterns.append(m)
    for m in re.findall(r"\b[A-Z][A-Z0-9_]{3,}\b", expanded):
        if m not in seen:
            seen.add(m)
            patterns.append(m)
    for m in PATH_LIKE_RE.findall(expanded):
        if len(m) >= 6 and m not in seen:
            seen.add(m)
            patterns.append(m)
    for m in re.findall(r"[\w.-]+\.(?:ts|md|yaml|yml)", expanded, re.I):
        base = m.split("/")[-1]
        if base not in seen:
            seen.add(base)
            patterns.append(base)
        stem = re.sub(r"\.[a-z]+$", "", base, flags=re.I)
        if stem and stem not in seen:
            seen.add(stem)
            patterns.append(stem)
    return patterns[:max_patterns]
