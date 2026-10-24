/**
 * Cursor CLI headless provider.
 *
 * Official output schema (https://cursor.com/docs/cli/reference/output-format, 2026-10-23):
 * a terminal result has result, duration_ms, duration_api_ms, session_id, request_id.
 * It does not document usage, token counts, or cost. Those stay NOT_MEASURED.
 * Unknown fields are ignored. The API key is taken from the process env
 * (CURSOR_API_KEY) and is never placed on argv.
 */

import { spawn } from "node:child_process";

export interface CursorToolCallCounts {
  started: number;
  completed: number;
  read_started: number;
  write_started: number;
  other_started: number;
}

export interface CursorCliMeasurement {
  text: string;
  model_id: string;
  duration_ms: number;
  duration_api_ms: number;
  session_id: string | "NOT_MEASURED";
  request_id: string | "NOT_MEASURED";
  input_tokens: "NOT_MEASURED";
  output_tokens: "NOT_MEASURED";
  cached_tokens: "NOT_MEASURED";
  cost_usd: "NOT_MEASURED";
  tool_calls: CursorToolCallCounts;
  schema: "cursor-cli-output-format-2026-10-23";
}

export interface CursorAgentSpawnResult {
  status: number;
  stdout: string;
  stderr: string;
}

export type CursorAgentSpawn = (
  bin: string,
  args: string[],
  options: { input: string; cwd: string; env: NodeJS.ProcessEnv },
) => Promise<CursorAgentSpawnResult>;

export function cursorAgentArgs(input?: { model?: string }): string[] {
  const args = ["-p", "--output-format", "stream-json", "--mode", "ask", "--trust"];
  const model = input?.model?.trim();
  if (model) args.push("--model", model);
  return args;
}

function emptyToolCounts(): CursorToolCallCounts {
  return { started: 0, completed: 0, read_started: 0, write_started: 0, other_started: 0 };
}

function noteToolCall(counts: CursorToolCallCounts, event: Record<string, unknown>): void {
  if (event.type !== "tool_call") return;
  if (event.subtype === "completed") {
    counts.completed += 1;
    return;
  }
  if (event.subtype !== "started") return;
  counts.started += 1;
  const call = event.tool_call;
  if (!call || typeof call !== "object") {
    counts.other_started += 1;
    return;
  }
  if ("readToolCall" in call) counts.read_started += 1;
  else if ("writeToolCall" in call) counts.write_started += 1;
  else counts.other_started += 1;
}

export function parseCursorAgentNdjson(stdout: string): CursorCliMeasurement {
  let model = "";
  let terminal: Record<string, unknown> | null = null;
  const toolCalls = emptyToolCounts();
  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      throw new Error("cursor_agent_ndjson_invalid");
    }
    if (event.type === "system" && event.subtype === "init" && typeof event.model === "string") {
      model = event.model;
    }
    noteToolCall(toolCalls, event);
    if (event.type === "result") terminal = event;
  }
  if (!terminal || terminal.subtype !== "success" || terminal.is_error !== false) {
    throw new Error("cursor_agent_result_missing");
  }
  if (typeof terminal.result !== "string") throw new Error("cursor_agent_result_text_missing");
  if (typeof terminal.duration_ms !== "number" || !Number.isFinite(terminal.duration_ms)) {
    throw new Error("cursor_agent_duration_missing");
  }
  if (typeof terminal.duration_api_ms !== "number" || !Number.isFinite(terminal.duration_api_ms)) {
    throw new Error("cursor_agent_duration_api_missing");
  }
  return {
    text: terminal.result,
    model_id: model || "cursor-cli-default",
    duration_ms: terminal.duration_ms,
    duration_api_ms: terminal.duration_api_ms,
    session_id: typeof terminal.session_id === "string" ? terminal.session_id : "NOT_MEASURED",
    request_id: typeof terminal.request_id === "string" ? terminal.request_id : "NOT_MEASURED",
    input_tokens: "NOT_MEASURED",
    output_tokens: "NOT_MEASURED",
    cached_tokens: "NOT_MEASURED",
    cost_usd: "NOT_MEASURED",
    tool_calls: toolCalls,
    schema: "cursor-cli-output-format-2026-10-23",
  };
}

export function spawnCursorAgent(
  bin: string,
  args: string[],
  options: { input: string; cwd: string; env: NodeJS.ProcessEnv },
): Promise<CursorAgentSpawnResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf-8");
    child.stderr.setEncoding("utf-8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (status) => {
      resolve({ status: status ?? 1, stdout, stderr });
    });
    child.stdin.write(options.input);
    child.stdin.end();
  });
}
