import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  loadAgentsEnvFile,
  resolveOrchestratorCliPaths,
  resolveOrchestratorRoot,
} from "../../src/cli/run-engine-env.js";

describe("run-engine env defaults", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "run-engine-env-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    delete process.env.ORCHESTRATOR_JOBS_DIR;
    delete process.env.ORCHESTRATOR_AGENTS_ENV;
    delete process.env.ORCHESTRATOR_ROOT;
  });

  it("resolveOrchestratorRoot prefers ORCHESTRATOR_ROOT over cwd", () => {
    process.env.ORCHESTRATOR_ROOT = "/opt/orchestrator";
    expect(resolveOrchestratorRoot()).toBe("/opt/orchestrator");
  });

  it("loads ORCHESTRATOR_JOBS_DIR from agents.env when flag omitted", () => {
    const envFile = join(tempDir, "agents.env");
    writeFileSync(envFile, 'export ORCHESTRATOR_JOBS_DIR="/tmp/custom-jobs"\n');
    process.env.ORCHESTRATOR_AGENTS_ENV = envFile;

    const paths = resolveOrchestratorCliPaths({}, true);
    expect(paths.jobsDir).toBe("/tmp/custom-jobs");
  });

  it("CLI --jobs-dir overrides agents.env", () => {
    const envFile = join(tempDir, "agents.env");
    writeFileSync(envFile, 'export ORCHESTRATOR_JOBS_DIR="/tmp/custom-jobs"\n');
    process.env.ORCHESTRATOR_AGENTS_ENV = envFile;

    const paths = resolveOrchestratorCliPaths({ "jobs-dir": "/cli/jobs" }, true);
    expect(paths.jobsDir).toBe("/cli/jobs");
  });

  it("does not override existing process.env keys", () => {
    const envFile = join(tempDir, "agents.env");
    writeFileSync(envFile, 'export ORCHESTRATOR_JOBS_DIR="/from-file"\n');
    process.env.ORCHESTRATOR_JOBS_DIR = "/already-set";
    loadAgentsEnvFile(envFile);
    expect(process.env.ORCHESTRATOR_JOBS_DIR).toBe("/already-set");
  });
});
