# Package note — systematic-debugging → debugger

**Status:** Tier 3 source skill (DO + técnicas).

**Agent Package pipeline:** `.cursor/skills/debugger/`  
**Capability:** `debug`  
**Commands:** `/debugger`, `/debug`

Não criar segundo agente com o mesmo Iron Law / 4 phases.
Consumidores MegaBrain (ex. após 3 retries de `/testes`) devem invocar **`debugger`**, não um package paralelo.

Técnicas neste directório continuam canónicas; o package `debugger` referencia-as via `references/` (symlinks).
