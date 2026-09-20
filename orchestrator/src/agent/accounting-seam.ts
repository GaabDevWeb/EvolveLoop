/**
 * B01 accounting seam for AgentExecutor usage — feeds existing counters.
 * Does NOT create AgentBudget / LLMBudget / ReasoningBudget.
 */

export interface ReasoningAccountingSink {
  tokens_used: number;
  tokens_unknown_events: number;
}

export function applyReasoningUsageToAccounting(
  accounting: ReasoningAccountingSink,
  usage: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    tokens_unknown?: boolean;
  },
): void {
  const total =
    usage.total_tokens ??
    (usage.input_tokens != null || usage.output_tokens != null
      ? (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0)
      : undefined);

  if (total != null && total > 0) {
    accounting.tokens_used += total;
  } else if (usage.tokens_unknown || total == null) {
    accounting.tokens_unknown_events += 1;
  }
}

export function isTokenBudgetExhausted(
  accounting: ReasoningAccountingSink,
  token_budget: number | null | undefined,
): boolean {
  if (token_budget == null) return false;
  return accounting.tokens_used >= token_budget;
}
