# Especialista: llm-security-reviewer

## Activar quando

OpenAI, Anthropic, RAG, agents, tool calling, MCP servers.

## Foco

[exploitation-checklist.md](../exploitation-checklist.md) § Segurança IA

- Prompt injection (direct/indirect)
- System prompt leak
- Tool exposure sem authz
- RAG sem filtro por tenant/user
- API keys no frontend
- Executar ações do modelo sem validação humana
- MCP: tools excessivos, path traversal em resources

## Evidence

L2: PoC mental jailbreak → tool call; L3: request real em dev

## Taxonomias

OWASP LLM Top 10 (mapear ao mais próximo); CWE-77; MITRE T1059

## Coverage

`LLM / AI`
