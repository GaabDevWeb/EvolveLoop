# GAP-005 — Durable HITL pause/resume (RunState)

```text
EXTERNAL_MECHANISM   OpenAI Agents RunState; LangGraph interrupt+Command; MAF request_info; LlamaIndex wait_for_event
PROBLEM_SOLVED       Pause for human across process boundaries without losing job state
OUR_CURRENT_MECHANISM Policy gates + jobs/checkpoints PARTIAL
EQUIVALENCE          PARTIAL
GAP                  Serialize approval waits as first-class orchestrator state with resume API
TRADE_OFF            Complexity vs reliability for long jobs
EVIDENCE             openai-agents M09, langgraph LG-INTERRUPT, maf MAF-HITL PROTOTYPE in dossiers
APPLICABILITY        Any tool requiring human confirmation mid-IR
DECISION             PROTOTYPE
```

**Provenance:** EXTERNAL SDKs.
**Confidence:** HIGH
