# Security Specialist Contract

Todo ficheiro em `references/specialists/` **deve** cumprir este contrato. Mantém consistência entre providers — evita divergência organizacional.

## Campos obrigatórios (cada especialista)

| Secção | Conteúdo |
|--------|----------|
| **ID** | Igual ao `id` em `capability-registry.yaml` |
| **Escopo** | O que audita; o que **não** audita |
| **Entradas** | Threat model, ficheiros, capabilities necessárias |
| **Saídas** | Formato achado; campos mínimos abaixo |
| **Taxonomias** | OWASP/CWE/MITRE que mapeia (ou N/A) |
| **Evidence level** | L0–L4 máximo que produz sem dynamic |
| **Limitações** | FN conhecidos; dependências de infra |
| **Activação** | signals, mode, requires_capabilities |
| **Encerramento** | Critério "domínio coberto"; coverage % a reportar |

## Saída mínima por achado

```yaml
provider_id: auth-reviewer
findings:
  - id: SEC-XXX          # orquestrador numera; provider sugere ou usa temp ID
    fingerprint: "..."   # hash estável — audit-memory
    title: string
    impact: critical|high|medium|low|informational
    exploitability: high|medium|low|very_low
    confidence_local: 0.0-1.0
    evidence_level: L0-L4
    location: { file, line, endpoint }
    owasp: []
    cwe: []
    mitre: []
    evidence: string
    reasoning: string
coverage_domains:
  authentication: 0.0-1.0
cost_actual:
  tier: low|medium|high
  tools_used: []
```

Judge funde `confidence_local` — provider **não** emite veredito final.

## Estilo normativo

- Usar: Vulnerabilidade Detectada, Mitigação Obrigatória
- Evitar: "recomenda-se", "talvez", "pode ser"
- Poucos achados fundamentados > lista genérica

## Registo no registry

Cada provider em `capability-registry.yaml` deve ter: `id`, `capabilities`, `entrypoint`, `modes`, `cost`, `signals` (ou `always`).

## Revisão

Alterar contrato = bump minor framework + re-correr benchmark completo.
