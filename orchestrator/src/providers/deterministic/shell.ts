import { spawn } from "node:child_process";
import type { ExecutionResult } from "../../capabilities/results.js";
import { cleanOutput } from "../../capabilities/results.js";
import { resolveWorkspacePath } from "./paths.js";

export interface ShellExecuteOptions {
  command: string;
  cwd?: string;
  timeoutMs?: number;
  workspaceRoot: string;
}

export function shellExecute(opts: ShellExecuteOptions): Promise<ExecutionResult> {
  const cwd = resolveWorkspacePath(opts.workspaceRoot, opts.cwd ?? ".");
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const start = Date.now();

  return new Promise((resolvePromise) => {
    const child = spawn(opts.command, {
      cwd,
      shell: true,
      env: { ...process.env },
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      if (stdout.length < 20_000) stdout += chunk.toString("utf-8");
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      if (stderr.length < 20_000) stderr += chunk.toString("utf-8");
    });

    const finish = (exitCode: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolvePromise({
        kind: "ExecutionResult",
        command: opts.command,
        cwd,
        exit_code: exitCode,
        timed_out: timedOut,
        stdout_excerpt: cleanOutput(stdout, 4000),
        stderr_excerpt: cleanOutput(stderr, 2000),
        duration_ms: Date.now() - start,
      });
    };

    child.on("error", (err) => {
      stderr += String(err.message);
      finish(1);
    });
    child.on("close", (code) => finish(code));
  });
}
