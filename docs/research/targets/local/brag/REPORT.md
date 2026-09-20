# Target Report — `brag`

| Campo | Valor |
|-------|-------|
| Target | `brag` (`tgt-brag`) — LOCAL_CORPUS |
| Category | skills-protocol / skill package (+ launch-site DX) |
| Mode | TARGET_RESEARCH |
| Depth | AUXILIARY — packaging, distribution, DX, examples, multimedia, docs, consumption |
| Versions examined | `.claude-plugin/plugin.json` **0.2.2**; tooling `skills/brag/scripts/pyproject.toml` **0.1.0**; git history short (~27 commits, initial subject documents `/brag`) |
| Access limitations | READ-ONLY; no Hyperframes install/run; no media playback (durations from prior corpus `ffprobe` sample only); Hyperframes domain skills **not in corpus** |
| Date | 2026-09-18 |
| Epistemic posture | Prefer OBSERVED tree + DOCUMENTED README/PRODUCT; runtime of Hyperframes = UNKNOWN |

## 1. What exists?

`brag` is a **single Agent Skill** (`/brag`) that instructs an agent to turn the current project’s website/app into a short launch video via **Hyperframes** (external CLI + sibling Hyperframes skills). The repository is intentionally a **distribution + demonstration vehicle**, not an agent runtime.

**OBSERVED inventory (high level):**

| Area | Contents |
|------|----------|
| Canonical skill | `skills/brag/` — `SKILL.md`, `references/` (inspect→plan→compose→deliver + tones + audio), bundled `assets/` (music/SFX + cue metadata), maintainer `scripts/` |
| Multi-agent discovery | Symlinks (git mode `120000`): `.claude/skills/brag`, `.agents/skills/brag`, `.opencode/skills/brag` → `../../skills/brag` |
| Claude plugin packaging | `.claude-plugin/plugin.json` + `marketplace.json` |
| Examples / “benchmark suite” | `examples/` — 5 fake product sites + committed `brag.mp4` |
| Launch docs site | `docs/` — static HTML/CSS/JS, GitHub Pages root; gallery uses `docs/examples/{horse-tinder,fish-flight-school,taxi-for-taxis}/` |
| DX check | `scripts/check-docs.mjs` — local href/src existence + gallery count copy consistency |
| Product copy | Root `PRODUCT.md` + per-example `PRODUCT.md` |

**Size / media dominance (corpus audit, OBSERVED):** ~74.8 MiB / ~340 files; dominated by audio/video. Sample durations (MEASURED by prior audit ffprobe): example videos ~21–23s; music beds ~1–3 min; UI SFX ~tens of ms.

**EXACT_DUPLICATE (OBSERVED, corpus `DUPLICATE-REPORT.md` + reconfirmed md5 on `index.html`):** for three gallery examples, `docs/examples/<slug>/{brag.mp4,index.html,styles.css}` ≡ `examples/<slug>/` byte-for-byte. Docs trees additionally carry `brag.jpg` + `site.jpg` (not mirrored in `examples/`). Two more examples (`bicycles-for-snakes`, `psychologists-for-chatbots`) live only under `examples/`. One SFX pair is byte-identical under different filenames (`footstep_carpet_003/004.ogg`).

**Not present (OBSERVED):** automated evals/tests for the skill; Hyperframes implementation; agent transcripts; CHANGELOG.

## 2. Architecture map (packaging lens — not agent runtime)

```text
┌─────────────────────────────────────────────────────────────┐
│ Repo = skill package + demos + launch site                  │
│                                                             │
│  skills/brag/  ←── symlink discovery paths (Claude/Codex/   │
│       │              opencode) + Claude plugin marketplace  │
│       │                                                     │
│       ├── SKILL.md (workflow + flags + creative laws)       │
│       ├── references/* (progressive disclosure per step)    │
│       ├── assets/{music,sfx} (+ cues / sfx-analysis)        │
│       └── scripts/ (librosa cue analysis — maintainer/opt)  │
│                                                             │
│  examples/*     fake products + rendered brag.mp4           │
│       ↕ EXACT_DUPLICATE (3 of 5)                            │
│  docs/examples/*  gallery media for GitHub Pages            │
│  docs/{index,styles,main}.js  install CTAs + video UX       │
└─────────────────────────────────────────────────────────────┘
                         │ consumes (DOCUMENTED)
                         ▼
              Hyperframes CLI + hyperframes-* skills
              (NOT_IN_CORPUS → runtime UNKNOWN)
```

**Boundary claim (DOCUMENTED in SKILL.md):** `/brag` owns product angle, storyboard, tone, audio selection, delivery expectations; Hyperframes owns composition structure, animation timing, lint/`check`, render.

## 3. Execution flow (skill consumption — DOCUMENTED; runtime not traced)

```text
User: "/brag" [+ --tone/--format/--duration/--voice/…]
  → Parse flags (voice opt-in first)
  → Step1 Inspect project code (index.html, CSS, README, …)  [references/step-1]
  → Gate: planning rubric answerable
  → Step2 Write brag-plan.md + storyboard (+ music cue guidance) [step-2]
  → Gate: plan exists; scenes sum 15–25s
  → Step3 Composition brief → Hyperframes composition/         [step-3, audio]
  → Gate: npx hyperframes check (0 errors)
  → Step4 Render brag.mp4, bake poster frame 0, share-copy.txt [step-4]
  → Output: brag-output[/timestamp]/
```

**Install / discovery flows (DOCUMENTED):**

1. Claude: `/plugin marketplace add latent-spaces/brag` → `/plugin install brag@brag`
2. Multi-agent: `npx skills add https://github.com/latent-spaces/brag --skill brag` (vercel-labs `skills` CLI)
3. Manual: `rsync`/`cp` of `skills/brag/` into agent skill dir
4. In-repo clone: auto-discovery via symlinks (Windows caveat DOCUMENTED)

## 4. Mechanisms (packaging / DX / media)

| id | problem | mechanism | evidence label | utility |
|----|---------|-----------|----------------|---------|
| M-BRAG-01 | Skill must be findable by multiple agents | **Canonical tree + multi-path symlinks** + `.gitattributes` `-text` on symlink paths | OBSERVED | HIGH for distribution |
| M-BRAG-02 | Claude marketplace install | **`.claude-plugin/{plugin,marketplace}.json`** | OBSERVED | HIGH for Claude DX |
| M-BRAG-03 | Non-Claude agents | **`npx skills add` + `docs/other-agents.md` fallbacks** | DOCUMENTED | HIGH for ecosystem |
| M-BRAG-04 | Long workflow without context blow-up | **Progressive disclosure:** SKILL.md orchestrates; step refs loaded on demand; explicit gates | OBSERVED | HIGH for skill authoring |
| M-BRAG-05 | Video needs licensed-feel audio without hunt | **Bundled music/SFX + cue JSON/MD + sfx-analysis** inside skill assets | OBSERVED | HIGH for demo quality |
| M-BRAG-06 | Prove the skill works | **Committed example `brag.mp4`s + PRODUCT.md fake products**; site “show don’t tell” | OBSERVED + DOCUMENTED | HIGH for adoption |
| M-BRAG-07 | Pages needs self-contained media | **`docs/` mirror of selected examples** (EXACT_DUPLICATE + posters) | OBSERVED | MEDIUM; costly duplication |
| M-BRAG-08 | Docs drift (broken media / wrong counts) | **`check-docs.mjs` path + gallery-count sanity** | OBSERVED | MEDIUM DX |
| M-BRAG-09 | Brand/install conversion | **Static launch site** as skill’s own brag (hero video, copy-install) | OBSERVED | HIGH product/DX |
| M-BRAG-10 | Hand off to external renderer | **Composition brief + Hyperframes ownership split** | DOCUMENTED | HIGH domain; LOW for MegaBrain core |
| M-BRAG-11 | Soft evaluation without tests | Examples framed as “benchmark suite” in README | DOCUMENTED | LOW rigor (no harness) |

## 5. Adoption analysis (separated — not a quality ranking)

| Factor | Notes | Label |
|--------|-------|-------|
| Technical | Thin skill surface; heavy external deps (Node 22+, FFmpeg, Hyperframes) | OBSERVED / DOCUMENTED |
| Product | Clear one-liner; video is the proof | DOCUMENTED (PRODUCT.md) |
| Distribution | Claude plugin + skills.sh/CLI + raw copy + in-repo symlinks | DOCUMENTED |
| Ecosystem | Couples to Hyperframes / HeyGen stack; music license note unfinished (music README) | DOCUMENTED / UNKNOWN terms |
| Timing | Launch-site energy; self-demo (“brag about brag”) | DOCUMENTED |
| Community / DX | Install copy buttons; other-agents doc; Windows symlink warning | OBSERVED |

## 6. Comparison with MegaBrain (per mechanism)

### M-BRAG-01 Multi-path skill discovery symlinks

```text
EXTERNAL_MECHANISM   Canonical skills/<name>/ + symlinks to agent-standard paths
PROBLEM_SOLVED       One tree, many agent discovery conventions
OUR_CURRENT_MECHANISM  CursorSKILLS: skills live under .cursor/skills/** (single primary path)
EQUIVALENCE          PARTIAL
GAP                  No first-class multi-agent symlink matrix in our packaging
TRADE_OFF            Portability vs Cursor-first simplicity; Windows symlink friction
EVIDENCE             OBSERVED symlinks + README table
APPLICABILITY        Distribution / skill packaging for shared repos
DECISION             ADAPT
```

### M-BRAG-02 / M-BRAG-03 Distribution channels

```text
EXTERNAL_MECHANISM   Claude marketplace manifests + npx skills add
PROBLEM_SOLVED       One-command install across hosts
OUR_CURRENT_MECHANISM  Local/skills-in-repo; no OBSERVED Claude marketplace packaging in baseline
EQUIVALENCE          NONE–PARTIAL (we have skills; not this multi-channel ship kit)
GAP                  Publish/install story for non-Cursor hosts
TRADE_OFF            Extra manifests vs Cursor-only
EVIDENCE             plugin.json, README, other-agents.md
APPLICABILITY        Only if we intentionally multi-host ship
DECISION             DEFER (Claude marketplace); ADAPT (document multi-host install patterns when needed)
```

### M-BRAG-04 Progressive disclosure + gates

```text
EXTERNAL_MECHANISM   SKILL.md + references/* + explicit Gate checklists
PROBLEM_SOLVED       Keep main skill short; force artifacts before next step
OUR_CURRENT_MECHANISM  Cursor skills with references/; Evidence Bus / gates in orquestrar
EQUIVALENCE          SUBSTANTIAL (pattern) / PARTIAL (their gates are prompt-checklist, not Evidence Bus)
GAP                  Optional: stronger machine-checkable gates for skill steps
TRADE_OFF            Prompt gates cheap vs evidence JSON heavier
EVIDENCE             SKILL.md steps 1–4
APPLICABILITY        skill-authoring
DECISION             ALREADY_PRESENT (pattern); ADAPT only if we want artifact-path gates standardized
```

### M-BRAG-05 Bundled multimedia assets in skill

```text
EXTERNAL_MECHANISM   Large binary assets ship inside skill package
PROBLEM_SOLVED       Zero-hunt audio for renders; reproducible demos
OUR_CURRENT_MECHANISM  Skills mostly markdown/scripts; heavy media uncommon
EQUIVALENCE          NONE
GAP                  Packaging policy for binary skill assets (size, LFS, license)
TRADE_OFF            Repo bloat (~75MiB) vs UX
EVIDENCE             assets/** counts; CORPUS-MAP size
APPLICABILITY        Niche skills that need media
DECISION             ADAPT (policy + optional asset packs); REJECT as default for all skills
```

### M-BRAG-06 / M-BRAG-07 Demo examples + docs mirror

```text
EXTERNAL_MECHANISM   Fake products + committed outputs; docs EXACT_DUPLICATE for Pages
PROBLEM_SOLVED       Show output without running pipeline
OUR_CURRENT_MECHANISM  Skill evals JSON / docs; no standard “demo gallery” pack
EQUIVALENCE          PARTIAL (we have evals; they have visual demos, no evals)
GAP                  Visual/demo harness for skills that produce artifacts
TRADE_OFF            Duplicate bytes vs symlink/build-time copy
EVIDENCE             DUPLICATE-REPORT; docs README gallery workflow
APPLICABILITY        Marketing + smoke proof for generative skills
DECISION             ADAPT (demo fixtures); PROTOTYPE better than dual-tree EXACT_DUPLICATE (symlink or generate-into-docs)
```

### M-BRAG-08 Docs sanity script

```text
EXTERNAL_MECHANISM   Node script validating local media refs + copy counts
PROBLEM_SOLVED       Broken gallery / lying marketing counts
OUR_CURRENT_MECHANISM  Skill lint/evals uneven; no OBSERVED equivalent tiny docs checker in baseline
EQUIVALENCE          NONE–PARTIAL
GAP                  Lightweight doc/asset integrity checks for skill showcases
EVIDENCE             scripts/check-docs.mjs
DECISION             ADAPT (small pattern)
```

### M-BRAG-10 Hyperframes handoff

```text
EXTERNAL_MECHANISM   Skill owns story; external tool owns render
PROBLEM_SOLVED       Avoid reinventing video pipeline
OUR_CURRENT_MECHANISM  Capability/Provider split for tools
EQUIVALENCE          SUBSTANTIAL at abstraction level (Capability vs Provider)
GAP                  N/A for video specifically
EVIDENCE             SKILL.md ownership paragraph
DECISION             ALREADY_PRESENT (architectural idea); REJECT importing Hyperframes into MegaBrain core
```

## 7. Decisions summary

| Mechanism | Decision | Confidence |
|-----------|----------|------------|
| Multi-path discovery symlinks | ADAPT | HIGH |
| Claude plugin marketplace kit | DEFER | MEDIUM |
| `npx skills` / other-agents docs | ADAPT | HIGH |
| Progressive refs + prompt gates | ALREADY_PRESENT (+ optional ADAPT) | HIGH |
| Bundled media in skill | ADAPT (policy) / REJECT (default) | HIGH |
| Example demos as proof | ADAPT | HIGH |
| docs↔examples EXACT_DUPLICATE | PROTOTYPE better sync strategy | MEDIUM |
| check-docs.mjs | ADAPT | MEDIUM |
| Hyperframes runtime coupling | REJECT (core) / DEFER (domain skill) | HIGH |
| Soft “benchmark suite” without tests | REJECT as eval substitute | HIGH |

## 8. UNKNOWN / CONFLICTS

See `UNKNOWNS.md`. Notable:

- **U-BR-01** Hyperframes runtime / sibling skills behavior — NOT_IN_CORPUS.
- **U-BR-02** Causal reason for maintaining EXACT_DUPLICATE trees (likely Pages self-containment — INFERRED only).
- **Conflict:** `.gitignore` lists `.agents/` and `.claude/` as ignored “local tooling”, yet symlink paths are **tracked** in git (OBSERVED). Intent UNKNOWN — possibly ignore for untracked clutter while force-tracking discovery links.
- **Version skew:** plugin `0.2.2` vs scripts package `0.1.0` — no CHANGELOG.

## 9. Sources

- Primary: `/home/gaab/Documentos/reverseEnginering/brag/**` (README, PRODUCT.md, SKILL.md, references/*, plugin manifests, docs/*, examples/*, scripts/check-docs.mjs, .gitattributes, .gitignore)
- Corpus audit: `_corpus-audit/{CORPUS-MAP,DUPLICATE-REPORT,TARGET-INVENTORY,RESEARCH-TARGETS,ARTIFACT-INVENTORY,EVALUATION-INVENTORY,raw/media-duration-sample}.md|yaml|json`
- Baseline: `research/OUR-SYSTEM-BASELINE.md`
- Skill methodology: `agent-architecture-mining` TARGET_RESEARCH templates

## 10. Handoff

- Para `agent-authoring` / `skill-authoring`: multi-host discovery matrix; progressive disclosure + gates; optional asset-pack policy; demo-gallery pattern; tiny docs integrity checks.
- Para `architect` / `adr`: whether MegaBrain skills ever ship large binaries; how to avoid EXACT_DUPLICATE publish mirrors.
- **Não implementado nesta skill.** Runtime Hyperframes out of AUXILIARY scope.
