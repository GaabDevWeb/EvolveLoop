# Signals

Signal ≠ Need.

## NeedSignal fields

id, fingerprint, timestamp, scope, source, type, domain, task_class, severity, evidence_refs, synthetic, metadata.

## Sources

telemetry | evidence | eval | user_feedback | execution | system

## Deduplication

Fingerprint = hash(type, domain, task_class, scope, execution_id|id, source).

## Severity

INFO | LOW | MEDIUM | HIGH | CRITICAL — not an architecture score.
