# 03 — Capability Certification

## Capabilities exercised adversarially

| Capability | Deny-list | Authority | Path scope | Result |
|------------|-----------|-----------|------------|--------|
| filesystem.write | yes | defaults permissive | OK if root set; FAIL if root omitted; symlink read FAIL | SIGNIFICANT_FINDINGS |
| filesystem.read | — | — | symlink escape BROKEN | FAIL scope integrity |
| shell.execute | yes | allowShell flag | cwd confined when root set | PARTIAL |
| knowledge.* | network false | — | — | PARTIAL |
| planning / demo.* | deny-list works | — | — | PASS deny-list |
| test.run | allowlist npm/vitest | confirmed:true forced | — | PARTIAL |

## Authority bypass attempts

1. Omit workspaceRoot + allowWrite → **ALLOW absolute write** (RT-A03-04) — **BROKEN**
2. Deny-list capability → DENY before execute — **RESISTED** (A03 suite)
3. Engineering confirmed:true always — **by design gap** vs CapabilityAuthority confirm model

**Capabilities Tested:** ≥12 families  
