# ADR-0001 — Alpha como gateway

**Status:** accepted

**Decisão:** Todo acesso externo passa por `src/alpha/core.py` (`AlphaGateway`). O módulo `beta` só consome via `from alpha.core import AlphaGateway`.

**Consequência:** alterações em `alpha` exigem revisão de `beta/consumer.py`.
