# P-012 — Repo structural map / summarized search

```text
PATTERN
Observed in: aider RepoMap; swe-agent ACI summarized search; partial indexes elsewhere (EXTERNAL)
Differences:
  - Token-budgeted structural map ≠ classic embedding RAG index ≠ semantic codebase index claims (Roo/Cursor — often DEFER/UNKNOWN)
Common mechanism: Prefer compact structural or summarized retrieval of code context over dumping trees or full-file RAG as architecture
Why it appears repeatedly: Coding agents burn context on irrelevant files
Evidence: CROSS §3 Repo map ADAPT; CROSS-INVESTIGATION-REVIEW §1.7 / §6 (don’t fuse with LI-RAG-CORE REJECT)
Applicability: Knowledge PARTIAL — ADAPT map/summarize ideas; REJECT replacing GaabWiki gate with vendor RAG; don’t invent Knowledge ABSENT from map gap alone
Decision: ADAPT
Confidence: MEDIUM
Supports Principle: PRINCIPLE-05
```
