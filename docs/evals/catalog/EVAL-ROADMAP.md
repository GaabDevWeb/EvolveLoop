# Eval Roadmap

## Immediately Runnable

- EV-001 Runtime Execution Integrity  
- EV-002 Capability/Provider Resolution  
- EV-003 Registry Correctness  
- EV-004 Policy/Authority (deterministic)  
- EV-005 Evidence Integrity (Evidence[])  
- EV-007 Offline Skill Activation  
- EV-008 Context Overhead (PROXY)  
- EV-009 Regression Stability  

## Needs Fixtures

- EV-006 Job Resume / STATE_WRITE — formalize disposable E-005 procedure for Eval Runner  
- EV-F-003 OS-kill — requires Prototype Gate approval of PT-002  

## Needs Instrumentation

- Confirm-path side effects (MG-006)  
- Live skill activation logs vs offline ranker  
- Multi-surface exactly-once instrumentation (MG-004)  

## Needs Runtime Primitive

- Sandbox enforcement (after architecture)  
- StuckDetector (after semantics)  
- Compaction/reinject (after ownership)  

## Needs Architecture Decision

- Security model checklist (ADR-DR-0003 open questions)  
- Stuck semantics checklist (ADR-DR-0004)  
- Context ownership (future ADR after ADR-DR-0005)  

## Deferred

- Live task_success Eval as production SLO  
- Vendor tokenizer Eval without policy  
- Full HITL product Eval  

**Do not implement in this phase.**
