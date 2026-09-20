/**
 * E-005 duplicate-mutate measurement harness (canonical source).
 * Runtime execution: copy to orchestrator/tests/evals/_e005_dup_mutate.test.ts, run, delete.
 * Does NOT modify orchestrator/src semantics.
 */
import { describe, it, expect } from "vitest";
import {
  mkdtempSync,
  writeFileSync,
  mkdirSync,
  readFileSync,
  appendFileSync,
  existsSync,
  readdirSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  ExecutionEngine,
  ProviderRouter,
  buildRegistryFromManifests,
  PluginLoader,
  JobFileExecutor,
  type SkillExecutor,
} from "../../src/index.js";
import type { ExecuteRequest, ExecuteResult, ProviderManifest, CapabilityIR, GraphNode } from "../../src/types/index.js";
import { JobStore } from "../../src/jobs/job-store.js";
import { buildSuccessEvidence } from "../../src/evidence/validator.js";
import { loadCheckpoint } from "../../src/jobs/checkpoint.js";
import { loadYamlFile } from "../../src/registry/manifest-loader.js";

const FEATURE_ID = "e005-dup-mutate";
const EXPECTED_MUTATIONS = 1;

interface MutationRecord {
  experiment_id: "E-005";
  condition: string;
  sequence: number;
  run_id: string;
  operation_id: string;
  mutation_id: string;
  node_id: string;
  capability: string;
  timestamp: string;
}

/** Append-only mutation logger — never short-circuits duplicates. */
class InstrumentingJobFileExecutor implements SkillExecutor {
  private sequence = 0;
  readonly records: MutationRecord[] = [];

  constructor(
    private jobsDir: string,
    private mutationLogPath: string,
    private condition: string,
  ) {
    mkdirSync(jobsDir, { recursive: true });
  }

  async execute(
    request: ExecuteRequest,
    skillPath: string,
    manifest: ProviderManifest,
  ): Promise<ExecuteResult> {
    this.sequence += 1;
    const record: MutationRecord = {
      experiment_id: "E-005",
      condition: this.condition,
      sequence: this.sequence,
      run_id: request.run_id,
      operation_id: `${request.node_id}:job_file_write`,
      mutation_id: `${request.run_id}:${this.sequence}`,
      node_id: request.node_id,
      capability: request.capability,
      timestamp: new Date().toISOString(),
    };
    this.records.push(record);
    appendFileSync(this.mutationLogPath, `${JSON.stringify(record)}\n`, "utf-8");
    return new JobFileExecutor(this.jobsDir).execute(request, skillPath, manifest);
  }
}

const testingIR: CapabilityIR = {
  apiVersion: "capability-orchestrator.io/v2",
  kind: "CapabilityGraph",
  metadata: { id: FEATURE_ID, ir_version: "2.0.0", policy_ref: "rapid-prototype" },
  spec: {
    nodes: [
      {
        id: "test-only",
        capability: "testing",
        type: "gate",
        dependencies: [],
        inputs: [],
        outputs: [{ id: "test-report", path: "telemetry/evidence/test.json" }],
        definition_of_done: [{ id: "d1", check: "Suite verde", verification: "automated" }],
        gate: { verdict_required: true },
      },
    ],
  },
};

function setup(condition: string) {
  const base = mkdtempSync(join(tmpdir(), `e005-${condition}-`));
  const jobsDir = join(base, "jobs");
  const mutationLogPath = join(base, "mutations.jsonl");
  mkdirSync(jobsDir, { recursive: true });

  const orchestratorRoot = join(import.meta.dirname, "../..");
  const agentsRoot = join(orchestratorRoot, "..");
  const providersDir = join(orchestratorRoot, "providers");

  const registry = buildRegistryFromManifests([
    {
      capability: "testing",
      provider: {
        id: "testing",
        priority: 80,
        cost: "low",
        quality_score: 0.9,
        availability: "active",
        version: "0.1.0",
      },
    },
  ]);

  const instrumented = new InstrumentingJobFileExecutor(jobsDir, mutationLogPath, condition);
  const router = new ProviderRouter();
  const loader = new PluginLoader(agentsRoot);
  const manifest = loadYamlFile(join(providersDir, "testing/provider.yaml"));
  router.register(loader.load(manifest as never, instrumented));

  const engineOpts = {
    registry,
    providers: router,
    agentsRoot,
    jobsDir,
    discovery: { agentsRoot, orchestratorProvidersDir: providersDir },
  };

  return { base, jobsDir, mutationLogPath, instrumented, engineOpts, orchestratorRoot };
}

function completePending(jobsDir: string, base: string) {
  const store = new JobStore(jobsDir);
  const job = store.listPending()[0];
  if (!job) throw new Error("no pending job");
  const node: GraphNode = {
    ...testingIR.spec.nodes[0],
    status: "running",
    retry_count: 0,
  };
  const evidencePath = join(base, `evidence-${job.run_id}.json`);
  writeFileSync(evidencePath, JSON.stringify(buildSuccessEvidence(node, job.run_id, "testing", 5)));
  store.completeJob(job.run_id, { success: true, evidence_path: evidencePath });
  return job;
}

function readMutations(path: string): MutationRecord[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf-8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as MutationRecord);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

describe("E-005 fixture — duplicate_mutate measurement", () => {
  const rawDir = process.env.E005_RAW_DIR;
  const matrix: Record<string, unknown>[] = [];

  function emit(row: Record<string, unknown>) {
    matrix.push(row);
    if (rawDir) {
      mkdirSync(rawDir, { recursive: true });
      writeFileSync(join(rawDir, "execution-matrix.json"), JSON.stringify(matrix, null, 2));
    }
  }

  it("CONTROL x5: uninterrupted wait-for-jobs → expected_mutations=1", async () => {
    for (let i = 1; i <= 5; i++) {
      const { base, jobsDir, mutationLogPath, instrumented, engineOpts } = setup("CONTROL");
      const engine = new ExecutionEngine(engineOpts);

      const runPromise = engine.run({
        ir: testingIR,
        policy_id: "rapid-prototype",
        feature_id: FEATURE_ID,
        wait_for_jobs_ms: 10_000,
      });

      await sleep(150);
      const job = completePending(jobsDir, base);
      const result = await runPromise;

      const mutations = readMutations(mutationLogPath);
      const observed = mutations.length;
      const duplicate = observed > EXPECTED_MUTATIONS;

      const row = {
        experiment_id: "E-005",
        condition: "CONTROL",
        sequence: i,
        job_run_id: job.run_id,
        feature_id: FEATURE_ID,
        node_id: "test-only",
        mutation: { expected: EXPECTED_MUTATIONS, observed },
        interruption: { requested: false, observed: false },
        persistence: {
          state_saved: false,
          state_restored: false,
          note: "no interrupt — checkpoint may clear on success",
        },
        resume: { attempted: false, succeeded: null },
        completion: { status: result.success ? "success" : "fail", blocked_reason: result.blocked_reason ?? null },
        duplicate_mutate: { value: duplicate, observed_mutations: observed },
        continuation: {
          same_engine: true,
          same_process: true,
          node_final_status: result.graph.nodes[0]?.status,
        },
        instrumented_in_memory: instrumented.observedMutations,
      };
      emit(row);

      expect(result.success).toBe(true);
      expect(observed).toBe(EXPECTED_MUTATIONS);
      expect(duplicate).toBe(false);

      if (rawDir) {
        writeFileSync(join(rawDir, `control-rep-${i}.json`), JSON.stringify({ row, mutations }, null, 2));
      }
    }
  });

  it("TREATMENT_SAME_ENGINE x5: interrupt wait=0 → complete → resume same engine", async () => {
    for (let i = 1; i <= 5; i++) {
      const { base, jobsDir, mutationLogPath, instrumented, engineOpts } = setup("TREATMENT_SAME_ENGINE");
      const engine = new ExecutionEngine(engineOpts);

      const first = await engine.run({
        ir: testingIR,
        policy_id: "rapid-prototype",
        feature_id: FEATURE_ID,
        wait_for_jobs_ms: 0,
      });

      expect(first.success).toBe(false);
      expect(first.blocked_reason).toBe("awaiting_external_jobs");
      const cp = loadCheckpoint(jobsDir, FEATURE_ID);
      expect(cp).not.toBeNull();

      const mutationsAfterInterrupt = readMutations(mutationLogPath).length;
      const job = completePending(jobsDir, base);

      const second = await engine.run({
        ir: testingIR,
        policy_id: "rapid-prototype",
        feature_id: FEATURE_ID,
        resume: true,
      });

      const mutations = readMutations(mutationLogPath);
      const observed = mutations.length;
      const duplicate = observed > EXPECTED_MUTATIONS;
      const uniqueRunIds = [...new Set(mutations.map((m) => m.run_id))];

      const row = {
        experiment_id: "E-005",
        condition: "TREATMENT_SAME_ENGINE",
        sequence: i,
        job_run_id: job.run_id,
        feature_id: FEATURE_ID,
        mutation: { expected: EXPECTED_MUTATIONS, observed, after_interrupt: mutationsAfterInterrupt },
        interruption: { requested: true, observed: true, mode: "wait_for_jobs_ms=0" },
        persistence: {
          state_saved: cp !== null,
          state_restored: true,
          checkpoint_feature_id: cp?.feature_id ?? null,
          checkpoint_node_statuses: cp?.graph.nodes.map((n) => ({ id: n.id, status: n.status })),
        },
        resume: { attempted: true, succeeded: second.success, same_engine_instance: true },
        completion: { status: second.success ? "success" : "fail", blocked_reason: second.blocked_reason ?? null },
        duplicate_mutate: { value: duplicate, observed_mutations: observed },
        continuation: {
          same_engine: true,
          same_process: true,
          mutation_run_ids: uniqueRunIds,
          node_final_status: second.graph.nodes[0]?.status,
          original_waiting_node: "test-only",
        },
        side_effect: {
          scope: "STATE_WRITE",
          operation_id: "test-only:job_file_write",
          expected_count: EXPECTED_MUTATIONS,
          observed_count: observed,
          note: "mutation = JobFileExecutor.execute → pending job JSON write",
        },
        instrumented_in_memory: instrumented.observedMutations,
      };
      emit(row);

      expect(second.success).toBe(true);
      expect(observed).toBe(EXPECTED_MUTATIONS);
      expect(duplicate).toBe(false);
      expect(mutationsAfterInterrupt).toBe(1);

      if (rawDir) {
        writeFileSync(join(rawDir, `treatment-same-engine-rep-${i}.json`), JSON.stringify({ row, mutations }, null, 2));
      }
    }
  });

  it("TREATMENT_NEW_ENGINE x5: interrupt → complete → resume new engine instance", async () => {
    for (let i = 1; i <= 5; i++) {
      const { base, jobsDir, mutationLogPath, instrumented, engineOpts } = setup("TREATMENT_NEW_ENGINE");
      const engine1 = new ExecutionEngine(engineOpts);

      const first = await engine1.run({
        ir: testingIR,
        policy_id: "rapid-prototype",
        feature_id: FEATURE_ID,
        wait_for_jobs_ms: 0,
      });
      expect(first.success).toBe(false);
      const cp = loadCheckpoint(jobsDir, FEATURE_ID);
      expect(cp).not.toBeNull();

      const job = completePending(jobsDir, base);
      const engine2 = new ExecutionEngine(engineOpts);
      const second = await engine2.run({
        ir: testingIR,
        policy_id: "rapid-prototype",
        feature_id: FEATURE_ID,
        resume: true,
      });

      const mutations = readMutations(mutationLogPath);
      const observed = mutations.length;
      const duplicate = observed > EXPECTED_MUTATIONS;

      const row = {
        experiment_id: "E-005",
        condition: "TREATMENT_NEW_ENGINE",
        sequence: i,
        job_run_id: job.run_id,
        mutation: { expected: EXPECTED_MUTATIONS, observed },
        interruption: { requested: true, observed: true, mode: "wait_for_jobs_ms=0" },
        persistence: { state_saved: true, state_restored: true },
        resume: { attempted: true, succeeded: second.success, same_engine_instance: false },
        completion: { status: second.success ? "success" : "fail" },
        duplicate_mutate: { value: duplicate, observed_mutations: observed },
        continuation: {
          same_engine: false,
          same_process: true,
          note: "new ExecutionEngine in same Node process — not OS kill",
          node_final_status: second.graph.nodes[0]?.status,
        },
        side_effect: {
          scope: "STATE_WRITE",
          expected_count: EXPECTED_MUTATIONS,
          observed_count: observed,
        },
        instrumented_in_memory: instrumented.observedMutations,
      };
      emit(row);

      expect(second.success).toBe(true);
      expect(observed).toBe(EXPECTED_MUTATIONS);
      expect(duplicate).toBe(false);

      if (rawDir) {
        writeFileSync(join(rawDir, `treatment-new-engine-rep-${i}.json`), JSON.stringify({ row, mutations }, null, 2));
      }
    }
  });

  it("writes summary metrics for collector", () => {
    if (!rawDir) return;
    const dupRates = matrix.filter((r) => r.condition !== "CONTROL");
    const summary = {
      experiment_id: "E-005",
      baseline_id: "baseline-v1-2026-09-18",
      expected_mutations: EXPECTED_MUTATIONS,
      sample: {
        control: matrix.filter((r) => r.condition === "CONTROL").length,
        treatment_same_engine: matrix.filter((r) => r.condition === "TREATMENT_SAME_ENGINE").length,
        treatment_new_engine: matrix.filter((r) => r.condition === "TREATMENT_NEW_ENGINE").length,
      },
      metrics: {
        resume_success:
          matrix.filter((r) => String(r.condition).startsWith("TREATMENT") && (r.resume as { succeeded?: boolean })?.succeeded)
            .length /
          Math.max(1, matrix.filter((r) => String(r.condition).startsWith("TREATMENT")).length),
        duplicate_mutate_any: matrix.some((r) => (r.duplicate_mutate as { value?: boolean })?.value === true),
        control_all_mutation_1: matrix
          .filter((r) => r.condition === "CONTROL")
          .every((r) => (r.mutation as { observed?: number })?.observed === 1),
        treatment_all_mutation_1: matrix
          .filter((r) => String(r.condition).startsWith("TREATMENT"))
          .every((r) => (r.mutation as { observed?: number })?.observed === 1),
      },
      same_process_interruption: "MEASURED",
      same_process_note:
        "Interruption = end of run(wait_for_jobs_ms=0) then run(resume) on same or new engine in same Node process. pause() flag not used as checkpoint interrupt. OS process kill NOT_MEASURED.",
      os_process_kill: "NOT_MEASURED",
      duplicate_side_effect: "MEASURED_AS_STATE_WRITE",
      state_integrity: "MEASURED",
      runs: matrix.length,
    };
    writeFileSync(join(rawDir, "summary-metrics.json"), JSON.stringify(summary, null, 2));
    // silence unused
    void readdirSync;
    void dupRates;
    expect(summary.metrics.duplicate_mutate_any).toBe(false);
  });
});
