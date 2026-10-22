/**
 * Frozen R01–R06 queries for V22 P2 measurement (from tasks-real-frozen.json).
 */

export interface BenchRTask {
  id: string;
  query: string;
  negation_needles: string[];
}

export const BENCH_R_TASKS: BenchRTask[] = [
  { id: "R01", query: "Qual algoritmo de integridade o checkpoint do engine usa?", negation_needles: [] },
  {
    id: "R02",
    query: "Qual variável de ambiente fornece a chave HMAC do checkpoint?",
    negation_needles: ["EVOLVELOOP_CHECKPOINT_HMAC_KEY"],
  },
  { id: "R03", query: "Onde o wiki-backend devolve RAG_REPO_MISSING quando não há vault?", negation_needles: ["não"] },
  {
    id: "R04",
    query: "Qual ADR adia compaction/reinject até ownership de contexto?",
    negation_needles: ["DEFER"],
  },
  {
    id: "R05",
    query: "No perfil default público, memory está habilitada?",
    negation_needles: ["false"],
  },
  {
    id: "R06",
    query: "O que acontece se um spawn PDA não herdar GATE_BUNDLE completo?",
    negation_needles: ["não", "bloqueado"],
  },
];
