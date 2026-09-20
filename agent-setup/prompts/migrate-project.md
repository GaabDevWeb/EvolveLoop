# Migrate project — existing AI config

When a project already has partial Cursor/wiki setup:

1. **Inventory** existing `.cursor`, rules, hooks, `.agent.yaml`
2. **Compare** with Agent Setup manifest (desired state)
3. **Report conflicts** — managed vs local vs unknown
4. **Recommend** minimal merge (preserve user data)

Do not overwrite without backup. Use `agent diff` output as input.
