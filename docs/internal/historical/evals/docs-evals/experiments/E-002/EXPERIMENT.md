# E-002 — Sandbox posture labeling / refuse-unenforceable

## Hypothesis

Posture enum `{enforced_sandbox, host_unknown, refused}` with refuse-when-unenforceable reduces false-safe labels on mutating tools.

## Research Origin

`docs/research/experiments/E-002-sandbox-posture-labels.md`

## Baseline

Sandbox = **NOT_IMPLEMENTED**. Authority flags `allowShell|allowWrite|allowNetwork` exist on DeterministicProvider path only.

## Classification

**BLOCKED**

Experiment requires posture labeling + enforcement attestation. Creating sandbox or fake “enforced_sandbox” labels is forbidden. Limited metadata classification without the enum is **not** the defined experiment and must not be presented as sandbox proof.

## Control / Treatment

Not executed.

## Observational note

Authority flag symbols exist (`raw/authority-flags.txt`). Posture enum search: no `enforced_sandbox` / refuse-unenforceable product surface (`raw/posture-enum-search.txt`).

**This experiment does not prove sandboxing.**

## Result Classification

**BLOCKED**
