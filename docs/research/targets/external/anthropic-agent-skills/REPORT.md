# Target Report — `anthropic-agent-skills`

| Campo | Valor |
|-------|-------|
| Target | Anthropic Agent Skills (open standard + Anthropic product surfaces) |
| Category | skills-protocol |
| Mode | TARGET_RESEARCH |
| Versions examined | agentskills.io Specification (fetched 2026-09-18); Anthropic docs overview / best-practices / API quickstart; Claude Code skills docs; engineering post 2025-10-16 (open standard update noted 2025-12-18); client-implementation guide (`agentskills/agentskills`) |
| Access limitations | Docs + public GitHub MDX only. No OBSERVED runtime dump of Claude system prompt, no proprietary activation scoring, no Skills API live call. Claude Code extensions documented separately from open standard. |
| Date | 2026-09-18 |
| Lens focus | Skill structure, Metadata, Progressive disclosure, Filesystem model, Resources, Scripts, On-demand loading, Composition, Context management, Discovery, Skill lifecycle, Instruction architecture |
| Explicit exclusion | Local corpus skill libraries (`superpowers`, `mattpocock/skills`, etc.) — **not** merged into this target |

Wiki: n/a (pesquisa externa OFFICIAL_EXTERNAL; sem edição Agent System).

---

## 1. What exists?

**DOCUMENTED:** Agent Skills is an open packaging format and loading protocol for giving general-purpose agents specialized procedural knowledge. A skill is a **directory** whose only required file is `SKILL.md` (YAML frontmatter + Markdown body), optionally bundling `scripts/`, `references/`, `assets/`, and other files.

**DOCUMENTED:** Progressive disclosure is the core design principle: agents load (1) name+description catalog at startup, (2) full `SKILL.md` when activated, (3) bundled resources/scripts only as needed.

**DOCUMENTED:** Anthropic products implement the format across Claude API (container + Skills API + code execution), Claude Code (filesystem discovery), and claude.ai (upload + pre-built document skills). Claude Code **extends** the open standard with many frontmatter fields and body features not portable to API/claude.ai.

**DOCUMENTED:** Skills complement MCP: Skills package workflows/expertise; MCP connects external tools/data. Plugins can bundle both (Claude Code / Agent SDK).

---

## 2. Architecture map

```text
┌─────────────────────────────────────────────────────────────┐
│  Surfaces (product)                                         │
│  Claude API / claude.ai / Claude Code / Agent SDK           │
└───────────────┬─────────────────────────────────────────────┘
                │ discover + disclose catalog (tier 1)
                ▼
┌─────────────────────────────────────────────────────────────┐
│  Skill package (filesystem or uploaded zip / Skills API)    │
│  skill-name/                                                │
│    SKILL.md          ← metadata + instructions              │
│    scripts/          ← executable (prefer run, not read)    │
│    references/       ← docs loaded on demand                │
│    assets/           ← templates/static                     │
└───────────────┬─────────────────────────────────────────────┘
                │ activate (model file-read / activate_skill /
                │           user slash-command / API container)
                ▼
┌─────────────────────────────────────────────────────────────┐
│  Context window                                             │
│  system: skill catalog                                      │
│  + SKILL.md body (tier 2)                                   │
│  + selected references (tier 3)                             │
│  + script stdout only (tier 3 code path)                    │
└─────────────────────────────────────────────────────────────┘
```

**Layers (conceptual):**

| Layer | Role | Label |
|-------|------|-------|
| Package format | Directory + `SKILL.md` contract | DOCUMENTED (agentskills.io) |
| Discovery | Scan scopes / API list / upload | DOCUMENTED (varies by surface) |
| Disclosure | Catalog in system prompt or tool desc | DOCUMENTED (client guide) |
| Activation | Model-driven and/or user-explicit | DOCUMENTED |
| Execution env | FS + bash/code execution (assumed) | DOCUMENTED (Anthropic overview) |
| Context hygiene | Protect skill content; dedupe; optional fork | DOCUMENTED (client guide / Claude Code) |

---

## 3. Execution flow

```text
Input: user task (+ installed/selected skills)
  → Startup: parse each SKILL.md frontmatter → build catalog (name, description [, location])
  → Inject catalog (~50–100 tokens/skill) into system prompt or activation-tool description
  → Model (or user `/name`) selects skill
  → Activate: inject SKILL.md body (full file or body-only) into context
  → Optional: model reads references/*.md via relative paths (one level deep recommended)
  → Optional: model executes scripts/*; only stdout/stderr enter context
  → Task proceeds with procedural guidance + tools
  → Final Output: task result (skill content ideally retained across turns / protected from compaction)
```

**API variant (DOCUMENTED):** client lists skills metadata → Messages request with `container.skills[]` + `code_execution` tool → Claude matches task → loads full instructions → runs skill code in sandbox.

**UNKNOWN:** exact matching algorithm for “skill is relevant” (beyond model judgment over description); no public scoring formula.

---

## 4. Mechanisms

| id | problem | mechanism | evidence label | utility |
|----|---------|-----------|----------------|---------|
| AAS-01 | Specialize agents without monolithic prompts | Directory skill package + `SKILL.md` | DOCUMENTED | High — portable unit of expertise |
| AAS-02 | Many skills would explode context | Progressive disclosure 3-tier | DOCUMENTED | High — scales catalog size |
| AAS-03 | Agent must know *when* to use a skill | Metadata `name` + `description` (what + when) | DOCUMENTED | High — discovery key |
| AAS-04 | Rare/deep knowledge wastes tokens if always loaded | On-demand references/assets via relative links | DOCUMENTED | High |
| AAS-05 | Token generation for fragile/deterministic ops | Bundled scripts executed; code stays out of context | DOCUMENTED | High when FS+exec available |
| AAS-06 | Unbounded skill libraries need a substrate | Filesystem / VM model (skills as folders) | DOCUMENTED | High for coding agents |
| AAS-07 | Activation without custom NLP triggers | Model-driven activation from catalog | DOCUMENTED (client guide) | Medium–High |
| AAS-08 | User needs deterministic invoke | Slash/mention harness injection | DOCUMENTED (client + Claude Code) | High for workflows with side effects |
| AAS-09 | Mid-session compaction drops guidance silently | Protect skill content; dedupe activations | DOCUMENTED (client guide) | High reliability |
| AAS-10 | Complex skill pollutes main thread | Optional subagent/fork execution | DOCUMENTED (client optional; Claude Code `context: fork`) | Medium |
| AAS-11 | Tools vs procedures confusion | Skills (workflows) complement MCP (external tools) | DOCUMENTED | High conceptual split |
| AAS-12 | Instruction authoring quality | Concise body; degrees of freedom; eval via real use | DOCUMENTED (best practices) | High DX |
| AAS-13 | Cross-client portability | Open standard 6 frontmatter fields; `.agents/skills/` scan convention | DOCUMENTED | High ecosystem |
| AAS-14 | Malicious skill supply chain | Trust + audit; gated project skills | DOCUMENTED | Critical security |

Full inventory: `MECHANISMS.yaml`.

---

## 5. Adoption analysis (separated)

| Factor | Notes | Label |
|--------|-------|-------|
| Technical | Simple format; depends on FS + tools or dedicated activation + (for API) code execution sandbox | DOCUMENTED |
| Product | Multi-surface Anthropic rollout; Claude Code has deepest extensions | DOCUMENTED |
| Distribution | Open standard site agentskills.io; Skills API; zip upload; FS dirs; plugins | DOCUMENTED |
| Ecosystem | Cross-client `.agents/skills/`; validators `skills-ref`; community clients | DOCUMENTED |
| Timing | Introduced Oct 2025; open standard Dec 2025; API skills out of beta (release notes) | DOCUMENTED |
| Community / DX | Authoring guides emphasize description quality, ≤500 lines SKILL.md, ≤5k tokens recommended | DOCUMENTED |
| Lock-in | Portable core vs Claude Code-only frontmatter/body features — packaging rejects unexpected keys on API/claude.ai | DOCUMENTED |

**Proibido neste relatório:** popularidade = superioridade técnica.

---

## 6. Comparison with MegaBrain (per mechanism)

Baseline: `research/OUR-SYSTEM-BASELINE.md` — Skills as `.cursor/skills/**/SKILL.md` IMPLEMENTED; Capability Registry / Orchestrator / Policy / Evidence Bus separate.

### AAS-01 Skill directory package

```text
EXTERNAL_MECHANISM   Directory + SKILL.md (+ scripts/references/assets)
PROBLEM_SOLVED       Portable specialization unit
OUR_CURRENT_MECHANISM  .cursor/skills/<id>/SKILL.md + references/ (OBSERVED pattern in CursorSKILLS)
EQUIVALENCE          SUBSTANTIAL
GAP                  Spec naming/validation stricter; optional assets/scripts conventions less formalized in MegaBrain authoring
TRADE_OFF            Aligning to open standard improves portability; MegaBrain-specific fields (pda_roles, capability) need metadata map or Claude-Code-only path
EVIDENCE             DOCUMENTED spec + OBSERVED local SKILL.md frontmatter
APPLICABILITY        High
DECISION             ALREADY_PRESENT (+ residual ADAPT for strict name/dir match + skills-ref)
```

### AAS-02 Progressive disclosure 3-tier

```text
EXTERNAL_MECHANISM   Catalog → body → resources
PROBLEM_SOLVED       Context cost of many skills
OUR_CURRENT_MECHANISM  Cursor skills + disable-model-invocation; body/refs pattern; exact Cursor catalog injection UNKNOWN without harness dump
EQUIVALENCE          PARTIAL
GAP                  Explicit tier-1 catalog contract + tier-3 script-vs-read distinction may be incomplete vs Anthropic client guide
TRADE_OFF            Enforcing tiers reduces tokens; requires harness support (not just authoring)
EVIDENCE             DOCUMENTED Anthropic; MegaBrain loading internals UNKNOWN
APPLICABILITY        High
DECISION             ADAPT
```

### AAS-03 Metadata-driven discovery

```text
EXTERNAL_MECHANISM   description encodes what + when; ~50–100 tok/skill
PROBLEM_SOLVED       Selection without loading bodies
OUR_CURRENT_MECHANISM  YAML description + command metadata in skills; orquestrar routes phases
EQUIVALENCE          SUBSTANTIAL for skill packages; routing also via orchestrator (different mechanism)
GAP                  Dual routing (orchestrator phases vs model skill trigger) can conflict if not designed
EVIDENCE             DOCUMENTED + OBSERVED disable-model-invocation on many MegaBrain skills
APPLICABILITY        High
DECISION             ALREADY_PRESENT (authoring); ADAPT (catalog quality / when_to_use discipline)
```

### AAS-05 Scripts without loading source

```text
EXTERNAL_MECHANISM   Execute scripts; only output in context
PROBLEM_SOLVED       Determinism + token efficiency
OUR_CURRENT_MECHANISM  Partial scripts in skills; Sandbox UNKNOWN–PARTIAL per baseline
EQUIVALENCE          PARTIAL
GAP                  No proven MegaBrain contract that scripts are preferred over reading into context
EVIDENCE             DOCUMENTED Anthropic; MegaBrain PROVEN path absent
APPLICABILITY        Medium–High where Shell allowed
DECISION             PROTOTYPE
```

### AAS-09 Context compaction protection

```text
EXTERNAL_MECHANISM   Exempt skill content from pruning; dedupe activations
PROBLEM_SOLVED       Silent skill amnesia mid-session
OUR_CURRENT_MECHANISM  UNKNOWN (Cursor compaction behavior not in baseline)
EQUIVALENCE          UNKNOWN / likely NONE–PARTIAL
GAP                  Needs harness-level support
EVIDENCE             DOCUMENTED client guide only
APPLICABILITY        High if compaction exists
DECISION             PROTOTYPE (hypothesis) / DEFER until Cursor/orchestrator compaction audited
```

### AAS-10 Subagent fork for skills

```text
EXTERNAL_MECHANISM   Optional skill-in-subagent; Claude Code context:fork
PROBLEM_SOLVED       Isolate heavy skill workflows
OUR_CURRENT_MECHANISM  PDA Task roles (plan/exec/gate/explore/…) IMPLEMENTED
EQUIVALENCE          PARTIAL (different abstraction: PDA vs skill-fork)
GAP                  Do not duplicate as second multi-agent system
EVIDENCE             DOCUMENTED Claude Code; OBSERVED MegaBrain PDA
APPLICABILITY        Medium — map to existing PDA, don’t copy frontmatter
DECISION             ALREADY_PRESENT (PDA) / REJECT parallel “skill-fork registry”
```

### AAS-11 Skills vs MCP

```text
EXTERNAL_MECHANISM   Skills = procedures; MCP = external tools
PROBLEM_SOLVED       Separation of concerns
OUR_CURRENT_MECHANISM  Skills + MCP servers in Cursor; Capability/Provider registries
EQUIVALENCE          SUBSTANTIAL conceptually
GAP                  Document the split explicitly in authoring guidelines
EVIDENCE             DOCUMENTED Anthropic + OBSERVED Cursor MCP
APPLICABILITY        High
DECISION             ALREADY_PRESENT
```

### AAS-14 Trust / audit for project skills

```text
EXTERNAL_MECHANISM   Trust gate for project-level skills; audit before install
PROBLEM_SOLVED       Prompt/code injection via repos
OUR_CURRENT_MECHANISM  Policy Engine PARTIAL; workspace trust UNKNOWN detail
EQUIVALENCE          PARTIAL
GAP                  Explicit skill-trust policy for cloned repos
EVIDENCE             DOCUMENTED client guide
APPLICABILITY        High
DECISION             ADAPT (policy), not new registry
```

---

## 7. Decisions summary

| Mechanism | Decision | Confidence |
|-----------|----------|------------|
| Skill package format (`SKILL.md` + dirs) | ALREADY_PRESENT | HIGH |
| Progressive disclosure 3-tier (harness) | ADAPT | MEDIUM |
| Metadata catalog quality | ALREADY_PRESENT / ADAPT authoring | HIGH |
| On-demand references | ALREADY_PRESENT | HIGH |
| Scripts-as-tools (stdout only) | PROTOTYPE | MEDIUM |
| Context compaction protection | DEFER / PROTOTYPE after audit | LOW |
| Skill-in-subagent fork (CC-specific) | REJECT as new system; use PDA | HIGH |
| Skills ↔ MCP split | ALREADY_PRESENT | HIGH |
| Open-standard-only frontmatter for portable skills | ADAPT | HIGH |
| Claude Code-only frontmatter as MegaBrain core | REJECT / DEFER | HIGH |
| `skills-ref` validation in authoring | ADAPT | MEDIUM |
| Project skill trust gating | ADAPT via Policy | MEDIUM |

---

## 8. UNKNOWN / CONFLICTS

See `UNKNOWNS.md`. Highlights:

- Activation matching internals: UNKNOWN.
- Cursor/MegaBrain exact tier-1 injection: UNKNOWN.
- Precedence CONFLICT: Claude Code docs (enterprise > personal > **project**) vs agentskills client guide (“project overrides user” as universal convention).
- Spec requires `name`+`description`; Claude Code treats most fields optional with fallbacks — CONFLICT across surfaces.

---

## 9. Sources

1. https://agentskills.io/specification — open standard format, progressive disclosure, optional dirs, validation  
2. https://github.com/agentskills/agentskills/blob/main/docs/client-implementation/adding-skills-support.mdx — discovery, catalog, activation, context management  
3. https://docs.anthropic.com/en/docs/agents-and-tools/agent-skills/overview — architecture, FS model, surfaces, security, limitations  
4. https://docs.anthropic.com/en/docs/agents-and-tools/agent-skills/best-practices — instruction architecture  
5. https://docs.anthropic.com/en/docs/agents-and-tools/agent-skills/quickstart — API progressive disclosure + container skills  
6. https://code.claude.com/docs/en/skills (Claude Code skills) — extensions, lifecycle, invocation control  
7. https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills — design rationale, MCP future complement  
8. Baseline: `/home/gaab/Documentos/reverseEnginering/research/OUR-SYSTEM-BASELINE.md`

---

## 10. Handoff

- Para `agent-authoring` / `skill-authoring`: alinhar portable skills aos **6 campos** do standard; descriptions “what+when”; SKILL.md ≤500 lines; refs one-level deep; documentar scripts “run don’t read”.
- Para `architect` / `adr`: ADAPT progressive disclosure no harness Cursor/orchestrator; Policy for project-skill trust; **não** criar Skill Registry paralelo ao Capability Registry.
- Para evals: hipóteses em `PROTOTYPE` (token savings; compaction amnesia) — ver ADVERSARIAL-REVIEW.
- **Não implementado nesta skill.**
