/** Held-out H07–H12 (frozen queries; see tasks-held-out-frozen.json). */
export interface BenchHTask {
  id: string;
  query: string;
}

export const BENCH_H_TASKS: BenchHTask[] = [
  {
    id: "H07",
    query: "No profiles/default.yaml, a memória episódica (wiki-mem) vem habilitada por padrão?",
  },
  {
    id: "H08",
    query:
      "Quando o diretório WIKI_ROOT não existe, qual error_code retorna WikiKnowledgeBackend.search?",
  },
  {
    id: "H09",
    query: "No contrato KNOWLEDGE-BACKEND-CONTRACT, qual o default de WIKI_CLI_MODULE?",
  },
  {
    id: "H10",
    query: "No ADR-0004, qual módulo Python CLI é o RAG de projeto?",
  },
  {
    id: "H11",
    query: "Quais valores o tipo KnowledgeBackendId aceita no código?",
  },
  {
    id: "H12",
    query: "Qual o timeout em milissegundos da chamada runWikiSearch ao CLI wiki?",
  },
];
