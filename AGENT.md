# AGENT.md — EvolveLoop agent-assisted setup

Attach this file to your coding agent (e.g. Cursor). Follow it **exactly**. You are installing **EvolveLoop**, a local-first agent orchestration architecture.

**Public entrypoint after install:** `/evolve`  
**Knowledge default:** Wiki via `KnowledgeBackend`  
**Do not** assume Linux, Debian, `/home/gaab`, or any author machine paths.

---

## Contract pipeline

```text
DETECT → INSPECT → BACKUP → ASK → CONFIGURE → INSTALL → VALIDATE → REPORT
```

**Never** run destructive commands without an explicit backup step.  
**Never** `rm -rf` user config (`~/.cursor`, `~/.agents`) or the user’s Wiki without confirmation **and** backup.  
**Never** log or commit secrets.

---

## 1. DETECT

Record (do not invent):

| Check | How |
|-------|-----|
| OS | `uname -s` / Windows equivalent |
| Cursor | Cursor installed? `~/.cursor` exists? |
| Git | `git --version` |
| Node | `node -v` (20+ recommended for orchestrator) |
| Python | `python3 --version` (Wiki CLI / hooks may need it) |
| Existing EvolveLoop | This repo present? `orchestrator/`, `.cursor/skills/orquestrar/` |
| Existing skills | List `.cursor/skills` / `~/.cursor/skills` |
| Existing profile | `profiles/default.yaml` / `EVOLVELOOP_PROFILE_PATH` |
| Existing Wiki | Is `WIKI_ROOT` or `RAG_REPO_ROOT` set? Does the path exist? |
| Local model | Optional tooling present? |
| Browser tooling | Optional (Playwright/Puppeteer MCP, etc.) |
| MCP | `mcp/mcp.json` vs user MCP config |

---

## 2. INSPECT

Read before changing anything:

- `profiles/default.yaml`
- `.cursor/hooks.json`
- `.cursor/commands/evolve.md`
- Hard-gate skills: `grill-me`, `image-to-code`, knowledge-grounding references under `orquestrar/references/`
- Essential skill pack inventory (do **not** reinstall pruned/removed decorative skills)

---

## 3. BACKUP

Before any write to user or project config:

1. Create a timestamped backup directory (e.g. `~/evolveloop-setup-backup-<ISO>/`).
2. Copy existing: project `.cursor/` (if modifying), `~/.cursor/hooks.json` / rules if installing globally, current profile, and note `WIKI_ROOT` path (do **not** copy entire Wiki corpus unless user asks).
3. Record backup path in the final report.

If backup fails → **stop**. Do not continue.

---

## 4. ASK

Ask **only** what cannot be detected. Prefer short choices:

### Wiki?

- [ ] No — configure without corpus; document that grounding-based tasks may require Wiki later  
- [ ] Create new — choose/create an empty vault directory; set `WIKI_ROOT`  
- [ ] Use existing — user provides path; validate read permissions  
- [ ] Custom path — validate permissions; never delete existing Wiki content  

### Memory (wiki-mem)?

- [ ] Off (public default)  
- [ ] On — enable profile `memory.enabled` and register wiki-mem hooks  

### Local model?

- Optional preferences only if user wants them documented in profile notes.

### Browser tooling?

- [ ] Skip  
- [ ] Configure optional MCP later  

### MCP?

- [ ] Skip  
- [ ] Copy `mcp/mcp.env.example` → local env (user fills secrets; never commit)

### Profile?

- [ ] Default (`profiles/default.yaml`)  
- [ ] Custom name (not “GaabType” unless this is explicitly the author’s personal branch)

Do **not** ask for information already detected.

---

## 5. CONFIGURE

1. Ensure `profiles/default.yaml` has portable defaults (`knowledge.backend: wiki`, `memory.enabled` per user choice).
2. Set env guidance: `WIKI_ROOT`, `AGENTS_ROOT` (= repo root), optional `ORCHESTRATOR_ROOT`.
3. Public hooks: keep orchestrator pickup hooks; add wiki-mem hooks **only** if memory On.
4. Confirm command `/evolve` exists; do not revive MegaBrain as public brand.
5. Preserve hard gates — never remove grill-me / image-to-code / knowledge-grounding.

---

## 6. INSTALL

Install **only** the Essential Skill Pack already in this repository:

- Pipeline skills under `.cursor/skills/` (orquestrar, workers, gates, wiki, …)
- Global essentials under `global-skills/` that are part of the validated pack (grill-me, image-to-code, systematic-debugging, …)

**Do not install** pruned/removed packs (examples of classes removed historically: gsap, framer-motion, lenis, particles, r3f-shaders, hover-effects, linkedin-posts, and similar decorative/demo skills).

Use existing installers when present:

- `scripts/install-agents-global.sh`
- `agent-setup/` declarative install

Generalize any leftover author-machine examples; never write `/home/<author>` into configs.

Optional: `cd orchestrator && npm install && npm run build` if the user wants the Execution Engine locally.

---

## 7. VALIDATE (structural — not full regression)

Without claiming quality/regression pass:

- [ ] `evolve.md` present  
- [ ] `profiles/default.yaml` parses; no personal absolute paths  
- [ ] Hard-gate skill dirs/files present  
- [ ] KnowledgeBackend sources present under `orchestrator/src/knowledge/`  
- [ ] If Wiki enabled: `WIKI_ROOT` points to an existing readable directory  
- [ ] If memory On: wiki-mem hooks registered; else absent from default hooks  
- [ ] No secrets written into tracked files  

Full test suites and fresh-clone batteries are **out of scope** for this onboarding contract unless the user explicitly requests them later.

---

## 8. REPORT

Emit YAML (no secrets):

```yaml
installation_report:
  environment:
    os:
    cursor:
    git:
    node:
    python:
  existing_installation:
  profile:
  wiki:
    mode: none|new|existing|custom
    path_set: true|false
  knowledge_backend: wiki
  skills:
    essential_pack: installed|partial|skipped
  gates:
    grill-me: present
    image-to-code: present
    knowledge-grounding: present
  agents:
  providers:
  warnings: []
  backup:
    path:
```

---

## Safety prohibitions

- No silent overwrites of user hooks/rules without backup  
- No deleting user’s Wiki  
- No blind deletion of `~/.cursor` or `~/.agents`  
- No secrets in logs or reports  
- No inventing “installation successful” if validate failed  

---

## After setup — how to work

1. Invoke **`/evolve`** for full orchestration cycles.  
2. Use **`/wiki`** for knowledge grounding.  
3. Use **`/mem`** only if memory was enabled.  
4. Read `README.md` for architecture and limitations.
