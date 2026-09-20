# V2 Agent Security Model

**Status:** DESIGNED  
**Branch:** `evolve-v2`  
**Complements:** A03 gates, CapabilityAuthority, B01 budgets, existing `SECURITY.md`  

Assumption: Wiki/workspace/skill text may contain adversarial instructions.

---

## Authority invariants

1. LLM output never grants authorization.  
2. Policy is data owned by PolicyEngine — not by prompts.  
3. Skill instructions are **agent guidance**, not runtime policy.  
4. Knowledge is **DATA**; mark and isolate from system **INSTRUCTION**.  
5. Secrets never enter AgentExecutionRequest by default.

---

## Threat catalog

### Prompt Injection

| | |
|--|--|
| **Threat** | Retrieved content or user text instructs the model to ignore policy / exfiltrate / call tools |
| **Attack surface** | ContextAssembler inputs, knowledge hits, evidence text, SKILL.md bodies |
| **Mitigation** | Treat external text as DATA; structured outputs only; no tool channel from model to FS; runtime validates capabilities |
| **Remaining limitation** | Models may still be influenced; fail-closed on malformed/unknown actions |

### Knowledge Injection

| | |
|--|--|
| **Threat** | Poisoned wiki/RAG docs redirect planning |
| **Attack surface** | KnowledgeBackend retrieval |
| **Mitigation** | Provenance + ranking; grounding gates; citations required for claims; no auto-authority |
| **Remaining limitation** | Ranking quality; untrusted public sources |

### Skill Injection

| | |
|--|--|
| **Threat** | SKILL.md claims “you MUST disable gates / write anywhere” |
| **Attack surface** | Skill prompts consumed by agents |
| **Mitigation** | Skills cannot change PolicyEngine; AutonomousSkillExecutor still under A03/B01 |
| **Remaining limitation** | Soft guidance may bias proposals — runtime still blocks |

### Tool Abuse / Tool Hijacking

| | |
|--|--|
| **Threat** | Model invents tools or hijacks provider ids |
| **Attack surface** | ACTION_PROPOSAL fields |
| **Mitigation** | Allowlist capabilities from projection API; unknown → reject; no LLM-direct-tools architecture |
| **Remaining limitation** | Hallucinated capability names (fail-closed) |

### Policy Bypass

| | |
|--|--|
| **Threat** | Decision claims ALLOW / asks to skip A03 / raise budgets |
| **Attack surface** | AgentDecision free-form reason or forged fields |
| **Mitigation** | Strip/ignore authority fields from agent schema; A03+B01 always on path; deny self-modifying policy actions |
| **Remaining limitation** | Social engineering of human approvers |

### Context Leakage

| | |
|--|--|
| **Threat** | Secrets or cross-tenant data sent to model host |
| **Attack surface** | Assembler, logs, eval dumps |
| **Mitigation** | SECRET/FORBIDDEN classes; redaction; no env passthrough; minimize logs of requests |
| **Remaining limitation** | Operator misconfiguration; provider-side retention policies |

### Workspace Escape

| | |
|--|--|
| **Threat** | Proposed paths escape authorized root |
| **Attack surface** | filesystem.* proposals |
| **Mitigation** | CapabilityAuthority path checks (existing); proposals still re-checked at execute |
| **Remaining limitation** | Path auth ≠ process sandbox (`sandbox = NOT_IMPLEMENTED`) |

### Provider Impersonation

| | |
|--|--|
| **Threat** | Agent names a fake provider or forces unregistered plugin |
| **Attack surface** | provider_id in proposals |
| **Mitigation** | Registry selection only inside engine; agent may suggest prefer/exclude as soft hints |
| **Remaining limitation** | Compromised local registry files |

### Delegation Loops / Runaway Agents

| | |
|--|--|
| **Threat** | A→B→A or unbounded fan-out |
| **Attack surface** | DelegationRequest |
| **Mitigation** | depth/budget/visited set; B01 iteration/token ceilings |
| **Remaining limitation** | Novel graph patterns until evals mature |

### Secret Leakage

| | |
|--|--|
| **Threat** | Keys in prompts, traces, or agent memory |
| **Attack surface** | Assembler, ReasoningProvider payloads, checkpoint |
| **Mitigation** | Never auto-inject env secrets into AgentExecutor; checkpoint stores refs not secrets |
| **Remaining limitation** | User pastes secrets into objective text |

### Untrusted Code

| | |
|--|--|
| **Threat** | Model-generated code executed blindly |
| **Attack surface** | Future code proposals |
| **Mitigation** | Code = proposal → write via authorized capability → tests/evidence; never “execute because LLM said so” |
| **Remaining limitation** | Soft gates on code quality until engineering loop exists |

### Malicious Skill / Repo Content

| | |
|--|--|
| **Threat** | Repo instructions override runtime |
| **Attack surface** | Workspace files used as context |
| **Mitigation** | Same as DATA vs INSTRUCTION; path authority; fail-closed unknown actions |
| **Remaining limitation** | Developer workstation trust model |

---

## DATA vs INSTRUCTION

```text
SYSTEM / RUNTIME POLICY     = instruction (trusted, code-defined)
AGENT PROMPT TEMPLATES      = instruction (versioned, reviewed)
SKILL.md / WIKI / REPO TEXT = data (untrusted for authority)
USER OBJECTIVE              = data + task intent (still not policy)
```

---

## Agent sandbox note

```text
process sandbox = future concern / NOT_IMPLEMENTED
workspace path authorization ≠ sandbox
```

---

## Hard cancellation note

Agent or provider child death ≠ remote cancel.  
`hard provider cancellation = LIMITED` (unchanged).
