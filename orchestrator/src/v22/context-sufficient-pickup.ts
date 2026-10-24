/**
 * Measurement-only rewrite of two pickup boilerplate orders.
 *
 * The product pickup stays unchanged. The harness applies this only when
 * the caller asks for the context-sufficient variant and the retrieval block
 * is already in the prompt.
 *
 * Sources of the orders, read on the V2.2 assembly:
 * - "Ler skill" is instruction 1 of buildPickupPrompt in job-pickup.ts.
 * - "Please carefully read the repository" is the bench briefing in
 *   buildBenchPickupBriefing.
 */

export const PICKUP_READ_REPO_SENTENCE =
  "Please carefully read the repository and produce an evidence-backed answer. Do not guess file paths.";

export const CONTEXT_SUFFICIENT_SKILL_LINE =
  "1. **Responder com o contexto fornecido.** O bloco de retrieval já está neste prompt. Ler um arquivo só se faltar evidência para a resposta.";

export const CONTEXT_SUFFICIENT_REPO_SENTENCE =
  "Answer from the context supplied in this prompt. Read a file only when that context lacks the evidence. Do not guess file paths.";

const READ_SKILL_LINE = /^1\. \*\*Ler skill:\*\* `[^`]+`$/m;
const RETRIEVAL_MARKER = "### Context (budgeted retrieval)";

export interface ContextSufficientRewrite {
  text: string;
  retrieval_present: boolean;
  replaced_skill_order: boolean;
  replaced_repo_order: boolean;
}

export function applyContextSufficientPickup(prompt: string): ContextSufficientRewrite {
  const retrievalPresent = prompt.includes(RETRIEVAL_MARKER) && /^--- path:.+ ---$/m.test(prompt);
  if (!retrievalPresent) {
    return {
      text: prompt,
      retrieval_present: false,
      replaced_skill_order: false,
      replaced_repo_order: false,
    };
  }
  const replacedSkill = READ_SKILL_LINE.test(prompt);
  let text = replacedSkill ? prompt.replace(READ_SKILL_LINE, CONTEXT_SUFFICIENT_SKILL_LINE) : prompt;
  const replacedRepo = text.includes(PICKUP_READ_REPO_SENTENCE);
  if (replacedRepo) text = text.split(PICKUP_READ_REPO_SENTENCE).join(CONTEXT_SUFFICIENT_REPO_SENTENCE);
  return {
    text,
    retrieval_present: true,
    replaced_skill_order: replacedSkill,
    replaced_repo_order: replacedRepo,
  };
}
