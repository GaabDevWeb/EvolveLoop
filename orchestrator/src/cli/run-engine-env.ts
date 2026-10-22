import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

/** Load export KEY=value lines from agents.env without overriding existing process.env */
export function loadAgentsEnvFile(path?: string): void {
  const envPath =
    path ??
    process.env.ORCHESTRATOR_AGENTS_ENV ??
    join(homedir(), ".cursor", "agents.env");
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const normalized = trimmed.startsWith("export ") ? trimmed.slice(7).trim() : trimmed;
    const eq = normalized.indexOf("=");
    if (eq <= 0) continue;
    const key = normalized.slice(0, eq).trim();
    let value = normalized.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

/** Directory containing package.json / run-jobs CLI (ORCHESTRATOR_ROOT or process.cwd()). */
export function resolveOrchestratorRoot(): string {
  const fromEnv = process.env.ORCHESTRATOR_ROOT;
  if (fromEnv) return resolve(fromEnv);
  return resolve(process.cwd());
}

export function resolveOrchestratorCliPaths(args: Record<string, string>, enableDiscovery: boolean) {
  loadAgentsEnvFile();

  const jobsDir =
    args["jobs-dir"] ??
    process.env.ORCHESTRATOR_JOBS_DIR ??
    (enableDiscovery ? "./jobs" : undefined);

  const agentsRoot = process.env.AGENTS_ROOT;
  const orchestratorRoot = process.env.ORCHESTRATOR_ROOT;
  const promptDir = process.env.ORCHESTRATOR_PROMPT_DIR;

  return { jobsDir, agentsRoot, orchestratorRoot, promptDir };
}
