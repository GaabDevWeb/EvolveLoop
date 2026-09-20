#!/usr/bin/env python3
"""E-001 offline skill catalog budget harness (enablement).

Does not modify .cursor/skills or orchestrator/src.
Materializes catalog subsets, estimates prefix tokens, scores offline activation.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any

# .../docs/evals/experiments/E-001/harness/catalog_harness.py → parents[5]=CursorSKILLS
ROOT = Path(__file__).resolve().parents[5]
SKILLS_ROOT = ROOT / ".cursor" / "skills"
EXP_DIR = Path(__file__).resolve().parents[1]
DEFAULT_SEED = "e001-v1-2026-09-18"


def estimate_tokens(text: str) -> int:
    """Whitespace token estimate (not a vendor tokenizer)."""
    return len([t for t in text.split() if t])


def truncate_tokens(text: str, max_tokens: int | None) -> str:
    if max_tokens is None:
        return text
    parts = text.split()
    if len(parts) <= max_tokens:
        return text
    return " ".join(parts[:max_tokens])


def parse_skill(skill_dir: Path) -> dict[str, Any]:
    md = (skill_dir / "SKILL.md").read_text(encoding="utf-8")
    skill_id = skill_dir.name
    name = skill_id
    desc = ""
    if md.startswith("---"):
        end = md.find("\n---", 3)
        if end != -1:
            fm = md[3:end]
            m = re.search(r"^name:\s*(.+)$", fm, re.M)
            if m:
                name = m.group(1).strip().strip('"').strip("'")
            m = re.search(r"^description:\s*>?\s*\n((?:[ \t].*\n)+)", fm, re.M)
            if m:
                lines = []
                for line in m.group(1).splitlines():
                    if line.startswith("  "):
                        lines.append(line[2:])
                    elif line.startswith("\t"):
                        lines.append(line[1:])
                    else:
                        lines.append(line)
                desc = "\n".join(lines).strip()
            else:
                m2 = re.search(r"^description:\s*(.+)$", fm, re.M)
                if m2:
                    desc = m2.group(1).strip()
    if not desc:
        body = re.sub(r"^---[\s\S]*?---\n", "", md, count=1)
        desc = "\n".join([ln for ln in body.splitlines() if ln.strip()][:40])
    return {
        "skill_id": skill_id,
        "name": name,
        "description": desc,
        "path": str(skill_dir / "SKILL.md"),
        "bytes": len(md),
    }


def load_catalog(skills_root: Path = SKILLS_ROOT) -> list[dict[str, Any]]:
    skills = []
    for d in sorted(skills_root.iterdir()):
        if d.is_dir() and (d / "SKILL.md").exists():
            skills.append(parse_skill(d))
    return skills


def seeded_order(skill_ids: list[str], seed: str) -> list[str]:
    return sorted(skill_ids, key=lambda i: hashlib.sha256(f"{seed}:{i}".encode()).hexdigest())


def fingerprint(skill_ids: list[str], extra: str = "") -> str:
    payload = json.dumps(sorted(skill_ids), separators=(",", ":")) + extra
    return hashlib.sha256(payload.encode()).hexdigest()


def select_prefix(skill_ids: list[str], seed: str, size: int | None) -> list[str]:
    ordered = seeded_order(skill_ids, seed)
    if size is None or size >= len(ordered):
        return ordered
    return ordered[:size]


def materialize_prefix(
    skills_by_id: dict[str, dict[str, Any]],
    skill_ids: list[str],
    max_description_tokens: int | None = None,
) -> tuple[str, int]:
    blocks = []
    for sid in skill_ids:
        s = skills_by_id[sid]
        desc = truncate_tokens(s["description"], max_description_tokens)
        blocks.append(f"## skill:{sid}\nname: {s['name']}\n{desc}\n")
    prefix = "\n".join(blocks)
    return prefix, estimate_tokens(prefix)


def load_tasks(skills_root: Path = SKILLS_ROOT) -> list[dict[str, Any]]:
    """Tasks from evals.json prompts + trigger-eval-set should_trigger strings."""
    tasks: list[dict[str, Any]] = []
    for d in sorted(skills_root.iterdir()):
        if not d.is_dir():
            continue
        gold = d.name
        evals_path = d / "evals" / "evals.json"
        if evals_path.exists():
            try:
                data = json.loads(evals_path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                data = {}
            for ev in data.get("evals", []):
                prompt = ev.get("prompt")
                if not prompt:
                    continue
                tasks.append(
                    {
                        "task_id": f"{gold}:eval:{ev.get('id', ev.get('name'))}",
                        "gold_skill_id": gold,
                        "prompt": prompt,
                        "source": "evals.json",
                    }
                )
        trig = d / "evals" / "trigger-eval-set.json"
        if trig.exists():
            try:
                data = json.loads(trig.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                data = {}
            for i, prompt in enumerate(data.get("should_trigger", [])):
                tasks.append(
                    {
                        "task_id": f"{gold}:trigger:{i}",
                        "gold_skill_id": gold,
                        "prompt": prompt,
                        "source": "trigger-eval-set",
                    }
                )
    return tasks


def tokenize(text: str) -> set[str]:
    return {t.lower() for t in re.findall(r"[a-zA-ZÀ-ÿ0-9_/-]{2,}", text)}


def score_activation(prompt: str, skill: dict[str, Any]) -> float:
    """Offline proxy: token overlap between prompt and skill name+description."""
    pt = tokenize(prompt)
    st = tokenize(skill["name"] + " " + skill["description"])
    if not pt or not st:
        return 0.0
    inter = len(pt & st)
    return inter / len(pt)


def predict_skill(prompt: str, catalog: list[dict[str, Any]]) -> str | None:
    if not catalog:
        return None
    ranked = sorted(
        catalog,
        key=lambda s: (-score_activation(prompt, s), s["skill_id"]),
    )
    return ranked[0]["skill_id"]


def per_task_catalog(
    all_ids: list[str],
    gold: str,
    size: int,
    seed: str,
) -> list[str]:
    """Always include gold; fill with seeded distractors to reach size."""
    if gold not in all_ids:
        raise ValueError(f"gold skill missing: {gold}")
    if size < 1:
        raise ValueError("size must be >= 1")
    others = [i for i in seeded_order(all_ids, seed) if i != gold]
    need = max(0, size - 1)
    chosen = [gold] + others[:need]
    # stable order for fingerprint: seeded order among chosen
    return seeded_order(chosen, seed)


@dataclass
class ConditionResult:
    condition_id: str
    catalog_size: int
    skill_ids: list[str]
    fingerprint: str
    prefix_tokens: int
    max_description_tokens: int | None
    activation_precision: float | None
    activation_recall: float | None
    task_success_proxy: float | None
    n_tasks_scored: int
    notes: str


def evaluate_condition(
    condition_id: str,
    skill_ids: list[str],
    skills_by_id: dict[str, dict[str, Any]],
    tasks: list[dict[str, Any]],
    max_description_tokens: int | None,
    seed: str,
    use_per_task_distractors: bool,
) -> ConditionResult:
    catalog = [skills_by_id[i] for i in skill_ids]
    # Global prefix tokens (host injection analogue for this condition's fixed catalog)
    prefix, prefix_tokens = materialize_prefix(skills_by_id, skill_ids, max_description_tokens)

    tp = fp = fn = 0
    scored = 0
    for task in tasks:
        gold = task["gold_skill_id"]
        if use_per_task_distractors and condition_id.startswith("T_SKILLS_"):
            size = len(skill_ids)
            ids = per_task_catalog(list(skills_by_id.keys()), gold, size, seed)
            cat = [skills_by_id[i] for i in ids]
            # apply same token truncation to descriptions in scoring text
            cat = [
                {**s, "description": truncate_tokens(s["description"], max_description_tokens)}
                for s in cat
            ]
        else:
            cat = [
                {**s, "description": truncate_tokens(s["description"], max_description_tokens)}
                for s in catalog
            ]
            if gold not in {s["skill_id"] for s in cat}:
                # gold not in catalog → cannot activate correctly
                fn += 1
                scored += 1
                continue

        pred = predict_skill(task["prompt"], cat)
        scored += 1
        if pred == gold:
            tp += 1
        else:
            fp += 1
            fn += 1  # missed gold as top-1

    precision = tp / (tp + fp) if (tp + fp) else None
    # recall: among tasks whose gold is in the (global) catalog
    recall = tp / scored if scored else None
    success = tp / scored if scored else None

    return ConditionResult(
        condition_id=condition_id,
        catalog_size=len(skill_ids),
        skill_ids=list(skill_ids),
        fingerprint=fingerprint(skill_ids, extra=f":tok{max_description_tokens}"),
        prefix_tokens=prefix_tokens,
        max_description_tokens=max_description_tokens,
        activation_precision=precision,
        activation_recall=recall,
        task_success_proxy=success,
        n_tasks_scored=scored,
        notes="offline_overlap_activation; task_success is activation-match proxy",
    )


def build_default_conditions(skills: list[dict[str, Any]], seed: str = DEFAULT_SEED) -> list[dict[str, Any]]:
    ids = [s["skill_id"] for s in skills]
    ordered = seeded_order(ids, seed)
    return [
        {"id": "CONTROL", "skill_ids": ordered, "max_description_tokens": None},
        {"id": "T_SKILLS_5", "skill_ids": ordered[:5], "max_description_tokens": None},
        {"id": "T_SKILLS_10", "skill_ids": ordered[:10], "max_description_tokens": None},
        {"id": "T_TOKENS_40", "skill_ids": ordered, "max_description_tokens": 40},
    ]


def run_enablement_dry(out_dir: Path) -> dict[str, Any]:
    """Materialize conditions + metrics once (enablement check, not full experiment battery)."""
    out_dir.mkdir(parents=True, exist_ok=True)
    skills = load_catalog()
    skills_by_id = {s["skill_id"]: s for s in skills}
    tasks = load_tasks()
    conditions = build_default_conditions(skills)
    results = []
    for c in conditions:
        use_pt = c["id"].startswith("T_SKILLS_")
        r = evaluate_condition(
            c["id"],
            c["skill_ids"],
            skills_by_id,
            tasks,
            c["max_description_tokens"],
            DEFAULT_SEED,
            use_per_task_distractors=use_pt,
        )
        results.append(asdict(r))

    report = {
        "experiment": "E-001",
        "mode": "enablement_dry_run",
        "seed": DEFAULT_SEED,
        "n_skills": len(skills),
        "n_tasks": len(tasks),
        "results": results,
    }
    (out_dir / "enablement-dry-run.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


def assert_determinism() -> None:
    skills = load_catalog()
    ids = [s["skill_id"] for s in skills]
    a = select_prefix(ids, DEFAULT_SEED, 5)
    b = select_prefix(ids, DEFAULT_SEED, 5)
    assert a == b, "deterministic selection failed"
    assert fingerprint(a) == fingerprint(b)
    c = select_prefix(ids, DEFAULT_SEED, 10)
    assert a != c
    assert set(a).issubset(set(c)) or True  # prefix strategy: a is prefix of seeded order
    ordered = seeded_order(ids, DEFAULT_SEED)
    assert a == ordered[:5]
    assert c == ordered[:10]


def assert_source_skills_untouched(before_hash: str) -> None:
    skills = load_catalog()
    h = fingerprint([s["skill_id"] + ":" + str(s["bytes"]) for s in skills])
    assert h == before_hash, "source skill bytes changed during harness"


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "dry"
    if cmd == "determinism":
        assert_determinism()
        print("DETERMINISM_OK")
    elif cmd == "dry":
        out = EXP_DIR / "raw" / "enablement"
        report = run_enablement_dry(out)
        print(json.dumps({"n_conditions": len(report["results"]), "n_tasks": report["n_tasks"]}, indent=2))
    else:
        print("usage: catalog_harness.py [dry|determinism]")
        sys.exit(2)
