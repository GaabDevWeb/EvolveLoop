# Knowledge Base (stack profiles)

Adapta plano com base em **padrões recorrentes** por stack. Complementa signals do [capability-registry.yaml](../capability-registry.yaml).

## Perfis embutidos

### Laravel

| Foco | Onde procurar |
|------|---------------|
| Policies / Gates | `authorize()`, Policy classes |
| Mass assignment | `$fillable` / `$guarded`, `User::create($request->all())` |
| Sanctum | token abilities, SPA auth |
| Storage | `Storage::` paths, symlink public |

### Next.js

| Foco | Onde procurar |
|------|---------------|
| Server Actions | `'use server'`, dados do cliente confiados |
| Middleware | auth só em middleware, rotas API sem |
| Route Handlers | `app/api/**/route.ts` authz |
| Cookies | `cookies()` server vs client leak |

### Node/Express (genérico)

| Foco | Onde |
|------|------|
| `req.body` | mass assignment, preço |
| Middleware order | auth depois do handler |

## Uso no auto-planeamento

1. Detectar perfil (composer.json → laravel; next.config → nextjs)
2. Merge `stack_profiles.<nome>.suggested_capabilities` com registry query
3. Inject **grep hints** no plano — não duplicar SEC por perfil

## Evolução (projeto)

Opcional: `.cursor/skills/security/knowledge/<project>.yaml` com fingerprints históricos — ver [audit-memory.md](audit-memory.md).

```yaml
project: acme-checkout
recurring_patterns:
  - mass_assignment in UserController
  - stripe webhook sem signature
```

Orquestrador prioriza esses paths no threat model.

## Não fazer

- Assumir vulnerável só por ser Laravel/Next
- Ignorar stack desconhecido — cair para registry genérico
