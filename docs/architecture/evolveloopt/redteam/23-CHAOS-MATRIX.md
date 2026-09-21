# 23 — Chaos Matrix

| Component | Fault | Expected | Observed | Evidence |
|-----------|-------|----------|----------|----------|
| runtime-gates | forged grill-me | DENY | ALLOW | RT-A03-01 |
| runtime-gates | dead fail_closed flag | DENY | ALLOW | RT-A03-02 |
| authority | no workspaceRoot | DENY escape | allow | RT-A03-03/04 |
| filesystem | ../ traversal | DENY | DENY | RT-A03-05 |
| filesystem | symlink out | DENY | LEAK | RT-A03-06 |
| checkpoint | truncate | CORRUPT | CORRUPT | RT-B04-01 |
| checkpoint | inflate budgets | reject | accept | RT-B04-02 |
| checkpoint | FS tamper | reject | accept | RT-B04-03 |
| checkpoint | dual claim | one | one | RT-B04-04 |
| evidence | auto DoD pass | unverified | pass | RT-EV-01 |
| evidence | metadata tamper | reject | valid | RT-EV-02 |
| secrets | read .env | deny | allow FS | RT-SEC-01/03 |
| Ollama | prompt inject | no escalate | resisted once | live notes |
| Cursor live | — | — | BLOCKED | no key |
| Engine | SIGKILL mid-run | resume | resume | b04 suite |
| Review | approve w/o evidence | deny | covered SE06 | unit |
| Worker | fake TEST_PASS | no COMPLETE | no COMPLETE | SE05 |
