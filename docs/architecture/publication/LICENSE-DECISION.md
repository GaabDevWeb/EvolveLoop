# License decision — public extraction

**Choice:** MIT

**Rationale:** Project source is author-originated TypeScript/Markdown skill pack. No AGPL/GPL dependency was identified in first-party `orchestrator/` runtime dependencies that would force a copyleft license for the distribution as a whole.

**Third-party skills:** Bundled skills under `global-skills/` and `.cursor/skills/` should retain any upstream notices present in those trees. Contributors must not add incompatible licensed code without a new ADR.

**External Wiki CLI (`gaabwiki` module name):** Optional host dependency outside this repo — not relicensed by this MIT grant.

**Status:** MIT applied via root `LICENSE` on `main`.
