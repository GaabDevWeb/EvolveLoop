/**
 * Machine-specific prefixes in a measured pickup prompt.
 * The files are still written on the local temp dir. The counted text uses
 * stable labels so input_tokens does not depend on the runner path.
 */

export function stableJobsLabel(taskId: string, arm: string): string {
  return `jobs/v22-p0-baseline/${taskId}/${arm}`;
}

export function normalizeMeasurementPaths(
  text: string,
  spec: { jobsDir: string; jobsLabel: string; orchestratorRoot: string; orchestratorLabel?: string },
): string {
  const orchestratorLabel = spec.orchestratorLabel ?? "orchestrator";
  const pairs = [
    [spec.jobsDir, spec.jobsLabel],
    [spec.orchestratorRoot, orchestratorLabel],
  ]
    .filter((pair): pair is [string, string] => pair[0].length > 1 && pair[0] !== pair[1])
    .sort((a, b) => b[0].length - a[0].length);
  let out = text;
  for (const [from, to] of pairs) out = out.split(from).join(to);
  if (spec.jobsDir.length > 1 && out.includes(spec.jobsDir)) {
    throw new Error("path normalization left the jobs directory in the measured prompt");
  }
  if (spec.orchestratorRoot.length > 1 && out.includes(spec.orchestratorRoot)) {
    throw new Error("path normalization left the orchestrator root in the measured prompt");
  }
  return out;
}
