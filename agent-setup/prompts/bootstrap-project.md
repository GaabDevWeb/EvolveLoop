# Bootstrap project wiki — agent prompt

Analyze the repository **without inventing knowledge**.

## Steps

1. **Detect** — language, framework, package manager, tests, CI, existing `.cursor`, wiki, AI config
2. **Architecture** — entrypoints, main modules, data flow (cite file paths)
3. **Contracts** — APIs, env vars, external deps (mark `verified` | `inferred` | `unknown`)
4. **Gaps** — what is not documented or unclear
5. **Knowledge map** — short index of where truth lives in the repo

## Rules

- Classify every claim: `verified` (read in code/docs), `inferred` (reasonable from structure), `unknown`
- Do **not** invent endpoints, schemas, or deployment details
- Prefer README, configs, entrypoints, tests as sources

## Output

```markdown
## Project knowledge map
### Verified
- ...
### Inferred
- ...
### Unknown
- ...
```
