# Security

| Actor | Observe | Propose | Mutate runtime | Create Agent |
|-------|---------|---------|----------------|--------------|
| EvolveLoopController | yes | yes | **no** | **no** |
| Prototype Gate | — | — | no (authorize only) | no |
| Implementation Gate | — | — | when authorized | via agent-authoring |

Need Detector is **read-heavy / mutation-light**.

No self-granted capabilities, no policy removal, no security bypass.
