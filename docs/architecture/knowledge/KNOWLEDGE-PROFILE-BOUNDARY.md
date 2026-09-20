# Knowledge / Profile Boundary

## CORE vs PROFILE

```text
CORE                          PROFILE / ENV
─────                         ─────────────
Engine, Policy, Evidence      WIKI_ROOT
Capability / Provider model   KNOWLEDGE_BACKEND (override)
KnowledgeBackend interface    profiles/default.yaml
Wiki as *selectable* default  wiki-mem enablement preference
knowledge-grounding policy    host paths, personal hooks surface
grill-me / image-to-code      personal project pack maps (skill docs)
```

## Profile is not a runtime

`profiles/default.yaml` configures composition. There is no ProfileEngine / ProfileScheduler.

## Loader

`orchestrator/src/config/profile.ts`

- Path: `$AGENTS_ROOT/profiles/default.yaml` or `EVOLVELOOP_PROFILE_PATH` (legacy: `MEGABRAIN_PROFILE_PATH`)
- Missing file → in-code `DEFAULT_PROFILE` (`knowledge.backend: wiki`)

## Direction of dependency

```text
profile → configures → core
core ↛ imports personal paths / Gaab identity
```

## Commands `/wiki` `/mem`

Remain the Wiki backend / episodic surfaces. Gate identity is **knowledge-grounding**; skill `wiki` satisfies it as Context Engineer for the default backend.
