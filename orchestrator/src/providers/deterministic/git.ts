import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { RepositoryState } from "../../capabilities/results.js";
import { cleanOutput } from "../../capabilities/results.js";
import { resolveWorkspacePath } from "./paths.js";

const execFileAsync = promisify(execFile);

async function git(
  workspaceRoot: string,
  args: string[],
  cwd?: string,
): Promise<{ stdout: string; stderr: string; code: number }> {
  const dir = resolveWorkspacePath(workspaceRoot, cwd ?? ".");
  try {
    const { stdout, stderr } = await execFileAsync("git", args, {
      cwd: dir,
      timeout: 15_000,
      maxBuffer: 2 * 1024 * 1024,
    });
    return { stdout: stdout.toString(), stderr: stderr.toString(), code: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: e.stdout?.toString() ?? "",
      stderr: e.stderr?.toString() ?? String(err),
      code: typeof e.code === "number" ? e.code : 1,
    };
  }
}

export async function gitStatus(workspaceRoot: string, cwd?: string) {
  const r = await git(workspaceRoot, ["status", "--porcelain=v1", "-b"], cwd);
  return {
    kind: "GitStatusResult" as const,
    exit_code: r.code,
    porcelain: cleanOutput(r.stdout, 8000),
    stderr: cleanOutput(r.stderr, 1000),
  };
}

export async function gitDiff(workspaceRoot: string, cwd?: string, staged = false) {
  const args = staged ? ["diff", "--cached"] : ["diff"];
  const r = await git(workspaceRoot, args, cwd);
  return {
    kind: "GitDiffResult" as const,
    exit_code: r.code,
    diff_excerpt: cleanOutput(r.stdout, 8000),
    stderr: cleanOutput(r.stderr, 1000),
  };
}

export async function gitLog(workspaceRoot: string, cwd?: string, limit = 10) {
  const r = await git(
    workspaceRoot,
    ["log", `-${limit}`, "--pretty=format:%H|%an|%ad|%s", "--date=iso"],
    cwd,
  );
  const commits = r.stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [hash, author, date, ...rest] = line.split("|");
      return { hash, author, date, subject: rest.join("|") };
    });
  return {
    kind: "GitLogResult" as const,
    exit_code: r.code,
    commits,
    stderr: cleanOutput(r.stderr, 1000),
  };
}

export async function gitInspect(workspaceRoot: string, cwd?: string): Promise<RepositoryState> {
  const dir = resolveWorkspacePath(workspaceRoot, cwd ?? ".");
  const hasGit = existsSync(join(dir, ".git"));

  if (!hasGit) {
    return {
      kind: "RepositoryState",
      repository: dir,
      branch: null,
      clean: true,
      ahead: 0,
      behind: 0,
      modified_files: 0,
      untracked_files: 0,
      staged_files: 0,
      conflicts: false,
      last_commit: { hash: null, subject: null, author: null, date: null },
      remotes: [],
      status_excerpt: "not_a_git_repository",
    };
  }

  const [branchR, statusR, logR, remoteR] = await Promise.all([
    git(workspaceRoot, ["rev-parse", "--abbrev-ref", "HEAD"], cwd),
    git(workspaceRoot, ["status", "--porcelain=v1", "-b"], cwd),
    git(workspaceRoot, ["log", "-1", "--pretty=format:%H|%an|%ad|%s", "--date=iso"], cwd),
    git(workspaceRoot, ["remote"], cwd),
  ]);

  const lines = statusR.stdout.split("\n").filter(Boolean);
  const branchLine = lines.find((l) => l.startsWith("## ")) ?? "";
  const fileLines = lines.filter((l) => !l.startsWith("## "));

  let ahead = 0;
  let behind = 0;
  const aheadM = branchLine.match(/ahead (\d+)/);
  const behindM = branchLine.match(/behind (\d+)/);
  if (aheadM) ahead = parseInt(aheadM[1], 10);
  if (behindM) behind = parseInt(behindM[1], 10);

  let modified = 0;
  let untracked = 0;
  let staged = 0;
  let conflicts = false;
  for (const line of fileLines) {
    const xy = line.slice(0, 2);
    if (xy === "??") untracked += 1;
    else {
      if (xy[0] !== " " && xy[0] !== "?") staged += 1;
      if (xy[1] !== " " && xy[1] !== "?") modified += 1;
      if (xy.includes("U") || xy === "DD" || xy === "AA") conflicts = true;
    }
  }

  const [hash, author, date, ...subj] = (logR.stdout || "").split("|");

  return {
    kind: "RepositoryState",
    repository: dir,
    branch: branchR.code === 0 ? branchR.stdout.trim() : null,
    clean: fileLines.length === 0,
    ahead,
    behind,
    modified_files: modified,
    untracked_files: untracked,
    staged_files: staged,
    conflicts,
    last_commit: {
      hash: hash || null,
      subject: subj.join("|") || null,
      author: author || null,
      date: date || null,
    },
    remotes: remoteR.stdout.split("\n").filter(Boolean),
    status_excerpt: cleanOutput(statusR.stdout, 2000),
  };
}
