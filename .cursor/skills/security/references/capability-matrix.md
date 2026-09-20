# Capability Matrix

**Fase 0 obrigatória** — antes de threat model ou análise. O plano depende do que o agente **realmente tem**.

## Inventário

Marcar ✓ (disponível), ✗ (indisponível), ? (não testado):

| Capability | Impacto se ausente |
|------------|-------------------|
| **Source code** | só análise superficial; FN alto |
| **Git / histórico** | secrets antigos não detectados |
| **Diff / escopo** | auditoria full-repo vs patch |
| **Terminal / shell** | sem scanners, sem PoC, sem docker |
| **Docker / compose** | sem análise container/IaC local |
| **Internet** | sem CVE lookup, sem npm audit remoto |
| **Browser / Playwright** | sem L3 dinâmico |
| **DB acesso** | sem validar permissões reais |
| **Homolog / staging URL** | sem L3 contra ambiente real |
| **Produção** | raramente — declarar risco legal |
| **Lockfiles / deps** | supply chain limitada |
| **CI config** | pipeline secrets, SARIF upload |

## Template no relatório

```markdown
### Capability Matrix

| Capability | Status | Notas |
|------------|--------|-------|
| Source code | ✓ | repo completo |
| Docker | ✓ | docker-compose.yml |
| Internet | ✗ | sandbox offline |
| Browser | ✗ | sem Playwright |

**Plano ajustado:** análise estática L1–L2; L3+ não disponível; dependency scan via lockfile local apenas.
```

## Regras

1. **Não assumir** capabilities — inferir do contexto (ficheiros lidos, tools disponíveis).
2. Capability ✗ → módulo ou evidence level **limitado**; registar em Threat Coverage como "não avaliado" ou cobertura parcial.
3. Se **sem source code** → veredito máximo "inconclusivo"; não emitir SEGURO com confiança.
4. Com **terminal + internet** → activar scanners em [auto-planning.md](auto-planning.md).
5. Com **browser/staging** → activar especialista `dynamic-pentest` se política do projeto permitir.
