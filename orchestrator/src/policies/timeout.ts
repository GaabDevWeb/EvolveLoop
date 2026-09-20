/**
 * Parse policy timeout strings: Ns | Nm | Nh | Nms
 */

export function parseTimeoutMs(timeout?: string): number | undefined {
  if (!timeout) return undefined;
  const m = timeout.match(/^(\d+)(ms|m|h|s)$/i);
  if (!m) return undefined;
  const n = parseInt(m[1], 10);
  const u = m[2].toLowerCase();
  if (u === "ms") return n;
  if (u === "h") return n * 3600_000;
  if (u === "m") return n * 60_000;
  return n * 1000;
}
