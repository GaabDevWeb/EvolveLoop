/** Normalized semantic results for deterministic capabilities. */

const ANSI_RE = /\u001b\[[0-9;]*m/g;

export function stripAnsi(text: string): string {
  return text.replace(ANSI_RE, "");
}

export function truncate(text: string, max = 4000): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n…[truncated ${text.length - max} chars]`;
}

export function cleanOutput(text: string, max = 4000): string {
  return truncate(stripAnsi(text).trim(), max);
}

export interface ExecutionResult {
  kind: "ExecutionResult";
  command: string;
  cwd: string;
  exit_code: number | null;
  timed_out: boolean;
  stdout_excerpt: string;
  stderr_excerpt: string;
  duration_ms: number;
}

export interface RepositoryState {
  kind: "RepositoryState";
  repository: string;
  branch: string | null;
  clean: boolean;
  ahead: number;
  behind: number;
  modified_files: number;
  untracked_files: number;
  staged_files: number;
  conflicts: boolean;
  last_commit: {
    hash: string | null;
    subject: string | null;
    author: string | null;
    date: string | null;
  };
  remotes: string[];
  status_excerpt?: string;
}

export interface SystemState {
  kind: "SystemState";
  platform: string;
  arch: string;
  hostname: string;
  uptime_s: number;
  cpu: { cores: number; loadavg: number[]; model?: string };
  memory: { total_bytes: number; free_bytes: number; used_ratio: number };
  disk?: { path: string; total_bytes?: number; free_bytes?: number };
  processes?: { count: number; top: Array<{ pid: number; cpu: number; mem: number; cmd: string }> };
}

export interface KnowledgeHit {
  source: string;
  section?: string;
  score?: number;
  retrieval_method?: string;
  project?: string;
  excerpt?: string;
  chunk_id?: string;
  degraded?: string;
}

export interface EvidenceSet {
  kind: "EvidenceSet";
  query: string;
  hits: KnowledgeHit[];
  retrieval_method: string;
  degraded?: string | null;
  error_code?: string | null;
}

export interface FileListResult {
  kind: "FileListResult";
  root: string;
  entries: Array<{ path: string; type: "file" | "dir" | "other"; size?: number }>;
  truncated: boolean;
}

export interface FileReadResult {
  kind: "FileReadResult";
  path: string;
  content: string;
  bytes: number;
  truncated: boolean;
}

export interface FileSearchResult {
  kind: "FileSearchResult";
  root: string;
  pattern: string;
  matches: Array<{ path: string; line?: number; excerpt?: string }>;
  truncated: boolean;
}

export interface ProjectInspectResult {
  kind: "ProjectInspectResult";
  root: string;
  name?: string;
  package_manager?: string;
  has_git: boolean;
  has_tests: boolean;
  entrypoints: string[];
  manifests: string[];
  repository?: Partial<RepositoryState>;
}
