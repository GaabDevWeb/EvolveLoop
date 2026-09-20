# Superfícies de Arquitetura

Mapear **antes** da análise linha-a-linha. Componentes mudam o modelo de ameaça mesmo quando o código do handler parece correto.

## Checklist arquitetural

Responder sim/não/desconhecido para cada item presente no repo, config ou docs:

| Componente | Perguntas de ameaça |
|------------|---------------------|
| **Reverse Proxy** (nginx, Traefik, ALB) | TLS termination, rate limit, body size, IP allowlist, header trust (`X-Forwarded-For`) |
| **CDN** (Cloudflare, Fastly) | Cache de respostas autenticadas? Cookies em edge? cache poisoning |
| **Cache** (Redis, Memcached) | Dados por user/tenant isolados? TTL? keys previsíveis? session fixation |
| **Queue** (SQS, Rabbit, Bull) | Mensagens com PII? replay? poison message? worker com privilégios elevados |
| **Worker / Job** | Corre com credenciais admin? processa input user sem re-validar? |
| **Event Bus** (Kafka, SNS) | Subscrições não autenticadas? event injection? |
| **Microservices** | trust boundary entre serviços? mTLS? service account excessivo? |
| **Object Storage** (S3, GCS, MinIO) | bucket público? signed URL com TTL? path traversal em keys |
| **Webhook** inbound | assinatura HMAC? replay? IP allowlist insuficiente? |
| **Webhook** outbound | secrets em logs? retry infinito? SSRF no callback URL? |
| **Cron / Scheduler** | endpoints internos expostos? race com jobs paralelos? |
| **DB** | privilégios app user vs migrations; TLS; backup exposto |
| **LLM / RAG** (se aplicável) | prompt injection; tool exposure; docs sem authz |

## Template no relatório

```markdown
### Mapa Arquitetural

| Componente | Presente | Confiança | Superfície / risco |
|------------|----------|-----------|-------------------|
| Redis sessão | sim | Confirmado | session hijack se sem HttpOnly |
| S3 uploads | sim | Muito provável | ACL público não verificado no código |
```

**Desconhecido** → registar como **falso negativo potencial** (ver [risk-scoring.md](risk-scoring.md)); não inventar mitigações de infra.

## Trust boundaries por camada

```text
[Cliente] ═══ Internet ═══ [Edge/CDN] ═══ [Proxy] ═══ [App] ═══ [Data plane]
                              ↑                ↑
                         cache poisoning   SSRF para rede interna
```

Cada seta é fronteira: documentar o que **cruza** sem validação.
