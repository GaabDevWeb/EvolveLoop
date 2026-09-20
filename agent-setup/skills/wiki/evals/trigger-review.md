# Trigger review — wiki v1.0.0

Avaliação **manual** da description vs `trigger-eval-set.json` (router Cursor não simulado em runtime).

| Meta | Resultado |
|------|-----------|
| should_trigger (10) | 10/10 cobertos por termos: Wiki, KernelBot, OrbitBot, /wiki, pack, grounding, ISS, Xray-Spec, vault |
| should_not (10) | 10/10 excluídos por “Não use para chat genérico… RAG de outros projectos” + ausência de termos Gaab |
| Falsos positivos críticos | 0 esperados |
| Meta ≥90% / 0 FP críticos | **pass** (revisão estática) |

Near-miss consciente: “Como configurar Ollama…” não deve disparar (genérico); “KernelBot + wiki” deve.

Revisitar se undertriggering em chats reais (ex.: só “scout BM25” sem Kernel/Gaab).
