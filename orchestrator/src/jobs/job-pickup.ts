import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { resolveOrchestratorRoot } from "../cli/run-engine-env.js";
import { writeSanitizedJsonFile, writeSanitizedTextFile } from "../evidence/evidence-bus.js";
import { redactSecrets } from "../evidence/secret-redaction.js";
import { JobStore, type SkillJob } from "./job-store.js";
import { preparePickupSpawnContext } from "./spawn-pickup-context.js";
import type { EventBus } from "../events/event-bus.js";

export interface PickupPlan {
  status: "idle" | "ready";
  jobs_dir: string;
  run_id?: string;
  skill_path?: string;
  capability?: string;
  provider_id?: string;
  prompt_path?: string;
  briefing?: string;
}

export function resolvePendingJob(
  store: JobStore,
  runId?: string,
): SkillJob | null {
  if (runId) {
    const job = store.readJob(runId);
    return job?.status === "pending" ? job : null;
  }
  return store.listPending()[0] ?? null;
}

export function buildPickupPrompt(
  job: SkillJob,
  jobsDir: string,
  orchestratorRoot?: string,
  spawnContext?: ReturnType<typeof preparePickupSpawnContext>,
): string {
  const orchRoot = orchestratorRoot ?? resolveOrchestratorRoot();
  const completeCmd = `cd ${orchRoot} && npm run run-jobs -- complete --jobs-dir ${jobsDir} --run-id ${job.run_id} --success --evidence <path-to-evidence.json>`;
  const failCmd = `cd ${orchRoot} && npm run run-jobs -- complete --jobs-dir ${jobsDir} --run-id ${job.run_id} --error "reason"`;

  const ctx =
    spawnContext ??
    preparePickupSpawnContext(job, jobsDir, { featureId: job.feature_id ?? job.node_id });

  return `# SkillJob Pickup — ${job.run_id}

**Capability:** ${job.capability}  
**Provider:** ${job.provider_id}  
**Node:** ${job.node_id}

## Instruções (obrigatório)

1. **Ler skill:** \`${job.skill_path}\`
2. **Executar briefing** abaixo; cumprir Definition of Done
3. **Emitir evidence** conforme contrato da capability (ex.: \`telemetry/evidence/*.json\`)
4. **Completar job:**
   - Sucesso: \`${completeCmd}\`
   - Falha: \`${failCmd}\`

## Briefing

${redactSecrets(job.briefing)}

${ctx.gate_bundle_block}

${ctx.budgeted_context_block}

${ctx.evidence_path ? `## Context budget evidence\n\nRecorded at: \`${ctx.evidence_path}\`\n` : ""}

## Definition of Done

\`\`\`json
${JSON.stringify(job.definition_of_done, null, 2)}
\`\`\`

## Inputs

\`\`\`json
${JSON.stringify(job.inputs, null, 2)}
\`\`\`

---
*Gerado por @agents/orchestrator run-jobs invoke*
`;
}

export function writePickupArtifacts(
  job: SkillJob,
  jobsDir: string,
  promptDir: string,
  options?: { eventBus?: EventBus },
): PickupPlan {
  mkdirSync(promptDir, { recursive: true });
  const promptPath = join(promptDir, "current-job.md");
  const spawnContext = preparePickupSpawnContext(job, jobsDir, {
    eventBus: options?.eventBus,
    featureId: job.feature_id ?? job.node_id,
  });
  const prompt = buildPickupPrompt(job, jobsDir, undefined, spawnContext);
  writeSanitizedTextFile(promptPath, prompt);
  writeSanitizedJsonFile(join(promptDir, "current-job.json"), {
    run_id: job.run_id,
    skill_path: job.skill_path,
    capability: job.capability,
    provider_id: job.provider_id,
    jobs_dir: jobsDir,
    prompt_path: promptPath,
    briefing: job.briefing,
    picked_at: new Date().toISOString(),
    context_owner_id: spawnContext.context_owner_id,
    context_budget_evidence: spawnContext.evidence_path,
    context_budget_telemetry: spawnContext.telemetry,
  });

  return {
    status: "ready",
    jobs_dir: jobsDir,
    run_id: job.run_id,
    skill_path: job.skill_path,
    capability: job.capability,
    provider_id: job.provider_id,
    prompt_path: promptPath,
    briefing: job.briefing,
  };
}

export function invokePickup(options: {
  jobsDir: string;
  promptDir: string;
  runId?: string;
  eventBus?: EventBus;
}): PickupPlan {
  const jobsDir = resolve(options.jobsDir);
  const store = new JobStore(jobsDir);
  const job = resolvePendingJob(store, options.runId);
  if (!job) {
    return { status: "idle", jobs_dir: jobsDir };
  }
  return writePickupArtifacts(job, jobsDir, resolve(options.promptDir), {
    eventBus: options.eventBus,
  });
}
