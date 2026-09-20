# Knowledge Before / After

| Dimension | Before | After | Status |
|-----------|--------|-------|--------|
| Retrieval | Wiki CLI via knowledge.ts | WikiKnowledgeBackend via resolve | UNCHANGED semantics |
| Grounding gate | wiki-grounding | knowledge-grounding (Wiki default) | UNCHANGED fail-closed |
| Evidence | EvidenceSet | EvidenceSet + backend id on inspect | PRESERVED |
| Memory | wiki-mem | wiki-mem (profile memory.enabled) | UNCHANGED |
| Paths | WIKI_ROOT env | WIKI_ROOT env + profile | UNCHANGED |
| Provider resolution | direct wiki impl | KNOWLEDGE_BACKEND → backend | SEAM ADDED |
| Agent /wiki | Context Engineer | same | UNCHANGED |
| Telemetry | provider.wiki | + knowledge.backend selectable | COMPATIBLE |
| EvolveLoop | green | 93/93 | UNCHANGED |
| Architecture | knowledge==Wiki coupling | Knowledge→Backend→Wiki | SEAM |
