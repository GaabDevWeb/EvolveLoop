# Target Report — `aider`

| Campo | Valor |
|-------|-------|
| Target | **Aider** (Aider-AI/aider) — AI pair programming in the terminal |
| Category | coding-agent |
| Mode | TARGET_RESEARCH |
| Provenance | OFFICIAL_EXTERNAL |
| Versions examined | GitHub `main` (~`0.86.3.dev`); latest release tag `v0.86.0` (2025-08-09); docs at aider.chat (fetched 2026-09-18) |
| Access limitations | Observational only: public docs + raw GitHub source via HTTPS. No local install, no runtime execution of Aider, no private/internal forks. MCP GitHub unavailable in this session; used GitHub REST + raw.githubusercontent.com. |
| Date | 2026-09-18 |
| Confidence (overall) | HIGH on documented public loop; MEDIUM on undocumented edge heuristics |

Wiki: n/a (alvo OFFICIAL_EXTERNAL; não é domínio Gaab product).

---

## 1. What exists?

**DOCUMENTED + OBSERVED:** Aider is an open-source (Apache-2.0) terminal coding agent that edits files in a local git repository by chatting with LLMs. Core product loop:

1. User selects / adds files to chat (and/or relies on repo map).
2. LLM receives structured context (system + examples + readonly + repo map + history + editable files + current turn).
3. LLM returns edits in a **model-specific edit format** (search/replace blocks, whole file, udiff, etc.).
4. Aider **parses**, **dry-runs**, **applies** edits to disk, optionally **auto-commits**, then optionally **lints/tests** and **reflects** errors back into another LLM turn (bounded).

It is **not** a multi-agent orchestration SDK: it is a single interactive coding loop with optional two-model **architect → editor** split, IDE watch mode (`AI!` comments), scripting CLI/Python, and broad LLM connectivity via LiteLLM-style model layer.

**Primary surfaces:** CLI (`aider`), in-chat `/` commands, optional browser/GUI (Streamlit), `--watch-files` IDE comments, `--message` one-shot scripting, Python `Coder.create().run()`.

---

## 2. Architecture map

```text
┌─────────────────────────────────────────────────────────────────┐
│ UX: terminal prompt / watch-files / browser / scripting         │
│     commands.py  ·  io.py  ·  watch.py  ·  gui.py               │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ Runtime: main.py → Coder (coders/base_coder.py)                 │
│   modes: code | ask | architect | help | context                │
│   reflections loop (max_reflections=3)                          │
└──────┬──────────────┬──────────────┬─────────────┬──────────────┘
       ▼              ▼              ▼             ▼
  RepoMap        ChatChunks      Models/LLM    GitRepo
  repomap.py     chat_chunks.py  models.py     repo.py
  tree-sitter    cache headers   litellm send  auto/dirty commit
  PageRank map   history sum.    edit_format   /undo
       │              │              │             │
       └──────────────┴──────┬───────┴─────────────┘
                             ▼
                    Edit format coders
         editblock_* · wholefile_* · udiff_* · patch_*
         search_replace.py (fuzzy apply strategies)
                             ▼
                    apply_updates → lint/test → reflect
```

**Key modules (OBSERVED on `main`):**

| Area | Paths |
|------|-------|
| Entrypoint | `aider/main.py`, `aider/__main__.py` |
| Coding loop | `aider/coders/base_coder.py` |
| Edit formats | `aider/coders/*_coder.py` + `*_prompts.py` |
| Apply heuristics | `aider/coders/search_replace.py`, `editblock_coder.py` |
| Repo context | `aider/repomap.py`, `aider/queries/` (tree-sitter tags) |
| Git | `aider/repo.py` |
| Commands / shell | `aider/commands.py`, `aider/run_cmd.py`, `aider/coders/shell.py` |
| History compression | `aider/history.py` (`ChatSummary`) |
| Architect | `aider/coders/architect_coder.py` |

---

## 3. Execution flow (OBSERVED + DOCUMENTED)

```text
Input (user message | /command | AI! watch | --message)
  → preproc: slash command OR file-mention prompts OR URL scrape
  → run_one:
       while message:
         format_messages → ChatChunks
           [system | examples | readonly | repo-map | done_history |
            chat_files | cur_turn | reminder]
         token check → optional cache warm
         model.send_completion (stream; retry; infinite-output prefill)
         post:
           file mentions in reply? → confirm /add → reflected_message
           reply_completed()  # ArchitectCoder: spawn editor Coder
           apply_updates:
             get_edits → dry_run → prepare_to_edit (dirty commit)
             → apply_edits (fuzzy SEARCH/REPLACE etc.)
             on format error → reflected_message = error
           auto_commit(edited)
           auto_lint? → confirm fix → reflected_message = lint
           suggest/run shell?
           auto_test? → confirm fix → reflected_message = test
         if reflected_message and reflections < max → loop
  → Final Output: files on disk ± git commit ± chat transcript
```

---

## 4. Mechanisms

| id | problem | mechanism | evidence label | utility |
|----|---------|-----------|----------------|---------|
| AIDER-REPOMAP | Large repo won't fit in context | Tree-sitter symbol map + dependency graph PageRank, token-budgeted (`--map-tokens`, default ~1k) | DOCUMENTED + OBSERVED | HIGH |
| AIDER-CHAT-FILES | Need precise editable content | Explicit `/add` (and CLI args); read-only via `/read-only` / `--read` | DOCUMENTED | HIGH |
| AIDER-FILE-MENTION | LLM/user names missing files | Offer to add mentioned paths; confirm; can reflect | OBSERVED (`check_for_file_mentions`) | MEDIUM–HIGH |
| AIDER-EDIT-FORMATS | Models fail at structured edits differently | Per-model edit formats: `whole`, `diff`, `diff-fenced`, `udiff`, editor-* variants | DOCUMENTED + OBSERVED | HIGH |
| AIDER-FUZZY-APPLY | Exact SEARCH blocks often mismatch | Multi-strategy replace (whitespace, edit-distance, `...` elision, DMP/git-ish strategies) | OBSERVED | HIGH |
| AIDER-REFLECT | Bad edits / lint / tests | Bounded reflection loop (`max_reflections=3`) feeding errors back as next user message | OBSERVED | HIGH |
| AIDER-ARCHITECT | Strong reasoners weak at edit syntax | Two-step: architect proposes → editor Coder applies (`ArchitectCoder.reply_completed`) | DOCUMENTED + OBSERVED | HIGH |
| AIDER-GIT | Undo / attribution / separate human vs AI dirty work | Auto-commit, dirty-commit before edit, `/undo`, attribution metadata; default skips hooks (`--no-verify`) | DOCUMENTED + OBSERVED | HIGH |
| AIDER-LINT-TEST | Catch AI breakage early | Auto-lint edited files; optional `--auto-test`; reflect errors with confirm | DOCUMENTED + OBSERVED | HIGH |
| AIDER-CHAT-CHUNKS | Cache + structure context | Ordered `ChatChunks` + ephemeral `cache_control` markers | DOCUMENTED + OBSERVED | MEDIUM–HIGH |
| AIDER-HISTORY-SUM | Long chats blow context | `ChatSummary` compresses older `done_messages` (weak/main models) | OBSERVED | MEDIUM |
| AIDER-INFINITE-OUT | Output token caps truncate edits | Assistant prefill continuation when `supports_assistant_prefill` | DOCUMENTED + OBSERVED | MEDIUM |
| AIDER-WATCH | Stay in IDE | `--watch-files` scans `AI` / `AI!` / `AI?` comments | DOCUMENTED | MEDIUM |
| AIDER-SHELL | Need runtime evidence | `/run`, `/test`, optional shell suggestions in replies | DOCUMENTED + OBSERVED | MEDIUM |
| AIDER-CONVENTIONS | Style/library preferences | Read-only conventions markdown in chat (not a separate policy engine) | DOCUMENTED | LOW–MEDIUM |
| AIDER-MODELS | Many providers | Model registry + edit-format defaults; `/model`, weak/editor models | DOCUMENTED + OBSERVED | HIGH (product) |
| AIDER-EVALS-PUBLIC | Measure edit skill | Public code-edit / refactor leaderboards | DOCUMENTED / MEASURED (their benches) | MEDIUM (external) |

---

## 5. Adoption analysis (separated — not merit ranking)

| Factor | Notes | Label |
|--------|-------|-------|
| Technical | Mature single-loop design; strong edit-apply + repo-map; limited multi-agent / capability registry | OBSERVED |
| Product | Pair-programming terminal UX; human keeps file selection control | DOCUMENTED |
| Distribution | PyPI / `aider-install`; Docker; Codespaces; high GitHub stars (~49k as of fetch) | DOCUMENTED / MEASURED |
| Ecosystem | Many LLM backends; conventions repo community | DOCUMENTED |
| Timing | Early open-source coding-agent pioneer (2023+); still actively released through 2025 | DOCUMENTED |
| Community / DX | Slash commands, watch mode, scripting; Python API explicitly **unsupported** for stability | DOCUMENTED |

Popular ≠ superior. Leaderboards are **their** eval harness, not MegaBrain evals.

---

## 6. Comparison with MegaBrain (per mechanism)

Baseline: `research/OUR-SYSTEM-BASELINE.md`.

### AIDER-REPOMAP

```text
EXTERNAL_MECHANISM   Tree-sitter + PageRank token-budgeted repo map
PROBLEM_SOLVED       Efficient whole-repo structural context without dumping all files
OUR_CURRENT_MECHANISM Knowledge/wiki grounding + RAG (PARTIAL/degraded BM25); no equivalent code-symbol graph map in Agent System
EQUIVALENCE          NONE–PARTIAL (knowledge grounding ≠ AST repo map)
GAP                  No first-class ranked codebase symbol map for coding tasks
TRADE_OFF            Map quality vs token cost; language coverage via tree-sitter queries
EVIDENCE             aider.chat/docs/repomap.html; aider/repomap.py (PageRank/networkx)
APPLICABILITY        Coding-agent / repo-aware capabilities
DECISION             ADAPT
```

### AIDER-EDIT-FORMATS + FUZZY-APPLY

```text
EXTERNAL_MECHANISM   Model-specific edit grammars + multi-strategy apply + reflect on failure
PROBLEM_SOLVED       Reliable file mutation from imperfect LLM text
OUR_CURRENT_MECHANISM Cursor/agent edits via IDE tools; orchestrator Evidence Bus validates process gates — not SEARCH/REPLACE fuzzy apply
EQUIVALENCE          PARTIAL (both mutate code; different stack)
GAP                  No portable, tested edit-format + fuzzy-apply library in MegaBrain orchestrator
TRADE_OFF            Complexity of strategies vs apply success rate
EVIDENCE             edit-formats docs; editblock_coder.py; search_replace.py; apply_updates reflection
APPLICABILITY        Any agent that applies model-proposed patches outside Cursor native tools
DECISION             PROTOTYPE (fuzzy apply / edit-format adapters) · ADAPT (reflection-on-apply-failure)
```

### AIDER-ARCHITECT

```text
EXTERNAL_MECHANISM   Plan model then editor model (two inference steps)
PROBLEM_SOLVED       Separate reasoning from structured edit emission
OUR_CURRENT_MECHANISM PDA roles plan/exec/gate (Task tool) — SUBSTANTIAL conceptual overlap
EQUIVALENCE          SUBSTANTIAL (plan→execute split) but different runtime contracts
GAP                  MegaBrain uses multi-agent PDA; Aider uses same-session forked Coder with shared IO
TRADE_OFF            Latency/cost of 2 calls vs single-shot edit quality
EVIDENCE             modes docs; architect_coder.py; blog 2024-09-26
APPLICABILITY        Model pairing for weak editors / strong reasoners
DECISION             ALREADY_PRESENT (plan/exec separation) — residual: model-pairing config as ADAPT if needed
```

### AIDER-GIT auto-commit / undo

```text
EXTERNAL_MECHANISM   Commit-per-AI-edit, dirty pre-commit, /undo, attribution
PROBLEM_SOLVED       Cheap rollback and clear AI vs human delta
OUR_CURRENT_MECHANISM Persistence/jobs PARTIAL; git workflow not Agent System core
EQUIVALENCE          NONE–PARTIAL
GAP                  No standardized “AI edit commit fence” in MegaBrain coding path
TRADE_OFF            Commit noise vs safety; default --no-verify skips hooks (security/process cost)
EVIDENCE             git.html; repo.py
APPLICABILITY        Local coding agents touching user repos
DECISION             ADAPT (commit fence + undo semantics) · note REJECT of blind --no-verify defaults
```

### AIDER-LINT-TEST reflect

```text
EXTERNAL_MECHANISM   Post-edit lint/test → human confirm → reflected repair turn
PROBLEM_SOLVED       Close the loop on broken AI edits
OUR_CURRENT_MECHANISM Evidence Bus + gate roles + skill evals — SUBSTANTIAL for “prove before proceed”, different shape
EQUIVALENCE          PARTIAL–SUBSTANTIAL
GAP                  MegaBrain gates are orchestration/evidence oriented; less “auto-lint edited files then reflect”
TRADE_OFF            Autonomy vs confirm prompts; flaky tests cause loops
EVIDENCE             lint-test docs; base_coder post-apply
APPLICABILITY        Coding capabilities
DECISION             ADAPT (bind lint/test outcomes into Evidence/reflect) · ALREADY_PRESENT for gated validation idea
```

### AIDER-CHAT-CHUNKS / caching / summarization

```text
EXTERNAL_MECHANISM   Ordered context chunks + prompt cache + ChatSummary
PROBLEM_SOLVED       Token cost, cache hits, long-session continuity
OUR_CURRENT_MECHANISM Memory episodic PARTIAL; Knowledge grounds; no ChatChunks analogue
EQUIVALENCE          PARTIAL
GAP                  Explicit cacheable context packing for coding sessions
TRADE_OFF            Cache layout constraints vs flexibility
EVIDENCE             caching docs; chat_chunks.py; history.py
APPLICABILITY        Long agent sessions with large static context
DECISION             ADAPT
```

### AIDER-WATCH / conventions / shell

```text
EXTERNAL_MECHANISM   IDE comment triggers; conventions as read-only files; /run shell
OUR_CURRENT_MECHANISM Hooks PARTIAL; skills as instruction packages; shell via agent tools
EQUIVALENCE          PARTIAL
DECISION             DEFER watch UX · ADAPT conventions-as-readonly knowledge · ALREADY_PRESENT shell-as-tool pattern
```

---

## 7. Decisions summary

| Mechanism | Decision | Confidence |
|-----------|----------|------------|
| Repo map (tree-sitter + rank) | **ADAPT** | HIGH |
| Explicit chat file selection | **ADAPT** (UX discipline) | HIGH |
| Edit formats per model | **ADAPT** / **PROTOTYPE** adapters | HIGH |
| Fuzzy apply + reflect on malformed edits | **PROTOTYPE** | HIGH |
| Architect/editor split | **ALREADY_PRESENT** (PDA plan/exec) + optional **ADAPT** pairing | MEDIUM–HIGH |
| Git auto-commit / undo fence | **ADAPT** | MEDIUM |
| Default skip pre-commit hooks | **REJECT** as default for MegaBrain | HIGH |
| Lint/test reflection | **ADAPT** into Evidence | HIGH |
| ChatChunks + prompt cache packing | **ADAPT** | MEDIUM |
| History summarization | **ADAPT** / **DEFER** until coding-session memory design | MEDIUM |
| Infinite output prefill | **DEFER** (provider-specific) | MEDIUM |
| Watch-files AI comments | **DEFER** | LOW–MEDIUM |
| Public leaderboards as our eval | **REJECT** as MegaBrain eval SSOT | HIGH |
| Whole Aider runtime adoption | **REJECT** | HIGH |

---

## 8. UNKNOWN / CONFLICTS

See `UNKNOWNS.md`.

Notable CONFLICT:

```text
CONFLICT:
  claim: Repo map graph ranking algorithm identity
  source_a: Official docs — "graph ranking algorithm" on file dependency graph
  source_b: Code aider/repomap.py — networkx pagerank (comment links pagerank_alg)
  difference: Docs are generic; code is PageRank-specific
  resolution: prefer_primary (code) — OBSERVED PageRank
```

---

## 9. Sources

### Official docs

- https://aider.chat/docs/
- https://aider.chat/docs/usage.html
- https://aider.chat/docs/usage/commands.html
- https://aider.chat/docs/usage/modes.html
- https://aider.chat/docs/usage/lint-test.html
- https://aider.chat/docs/usage/watch.html
- https://aider.chat/docs/usage/caching.html
- https://aider.chat/docs/usage/conventions.html
- https://aider.chat/docs/repomap.html
- https://aider.chat/docs/git.html
- https://aider.chat/docs/more/edit-formats.html
- https://aider.chat/docs/more/infinite-output.html
- https://aider.chat/docs/scripting.html
- https://aider.chat/docs/leaderboards/
- https://aider.chat/2023/10/22/repomap.html
- https://aider.chat/2024/09/26/architect.html

### Official code (GitHub Aider-AI/aider `main`)

- `aider/coders/base_coder.py`, `architect_coder.py`, `editblock_coder.py`, `search_replace.py`, `chat_chunks.py`
- `aider/repomap.py`, `aider/repo.py`, `aider/history.py`, `aider/main.py`, `aider/commands.py`

### Meta

- Repo: https://github.com/Aider-AI/aider (Apache-2.0; ~49k stars at fetch; latest release `v0.86.0`)

---

## 10. Handoff

- Para `agent-authoring`: **não** embutir Aider. Considerar findings `ADAPT`/`PROTOTYPE` — sobretudo repo-map capability, edit-apply+reflect, lint/test→evidence, context chunk packing.
- Para `architect` / `adr`: ADR candidates — (1) ranked AST repo map; (2) edit-format strategy registry; (3) git commit fence for AI edits; (4) reject default hook-skip.
- **Não implementado nesta skill.**

---

## Adversarial summary (see ADVERSARIAL-REVIEW.md)

Strongest transferable mechanisms: **repo map**, **edit-format + fuzzy apply + reflection**, **post-edit validation loop**. Weakest transfer: wholesale CLI product, watch-mode UX, their leaderboards as truth. Risk of false equivalence: MegaBrain PDA plan/exec ≠ Aider architect/editor implementation.
