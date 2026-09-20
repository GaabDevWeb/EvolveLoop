# ADR — Tool Authority Model C

- **Status:** Accepted  
- **Date:** 2026-09-20  
- **Grill-me:** Q3  

## Decision

Default `reasoning_only`. Vendor `agent_runtime` allowed only with explicit mode and **A03 LIMITED**. EvolveLoop Worker/Runtime remain side-effect authority for PASS claims.

## Rejected

Model A as default; claiming A03 PASS with vendor-native FS/shell tools.
