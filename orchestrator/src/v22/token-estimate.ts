/** Whitespace token estimate (V22 bench convention, same as E-001 style). */
export function estimateWhitespaceTokens(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}
