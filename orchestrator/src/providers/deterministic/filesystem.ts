import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";
import type {
  FileListResult,
  FileReadResult,
  FileSearchResult,
} from "../../capabilities/results.js";
import { cleanOutput } from "../../capabilities/results.js";
import { resolveWorkspacePath } from "./paths.js";

const MAX_LIST = 500;
const MAX_SEARCH = 200;
const MAX_READ = 100_000;

export function filesystemRead(workspaceRoot: string, pathInput: string): FileReadResult {
  const abs = resolveWorkspacePath(workspaceRoot, pathInput);
  const raw = readFileSync(abs, "utf-8");
  const truncated = raw.length > MAX_READ;
  const content = truncated ? raw.slice(0, MAX_READ) : raw;
  return {
    kind: "FileReadResult",
    path: relative(workspaceRoot, abs) || ".",
    content: cleanOutput(content, MAX_READ),
    bytes: Buffer.byteLength(raw, "utf-8"),
    truncated,
  };
}

export function filesystemWrite(
  workspaceRoot: string,
  pathInput: string,
  content: string,
): { kind: "FileWriteResult"; path: string; bytes: number } {
  const abs = resolveWorkspacePath(workspaceRoot, pathInput);
  mkdirSync(join(abs, ".."), { recursive: true });
  writeFileSync(abs, content, "utf-8");
  return {
    kind: "FileWriteResult",
    path: relative(workspaceRoot, abs) || ".",
    bytes: Buffer.byteLength(content, "utf-8"),
  };
}

export function filesystemList(workspaceRoot: string, pathInput = "."): FileListResult {
  const abs = resolveWorkspacePath(workspaceRoot, pathInput);
  const entries: FileListResult["entries"] = [];
  let truncated = false;

  function walk(dir: string, depth: number): void {
    if (entries.length >= MAX_LIST) {
      truncated = true;
      return;
    }
    let names: string[];
    try {
      names = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of names) {
      if (entries.length >= MAX_LIST) {
        truncated = true;
        return;
      }
      if (name === "node_modules" || name === ".git") continue;
      const full = join(dir, name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      const rel = relative(workspaceRoot, full);
      if (st.isDirectory()) {
        entries.push({ path: rel, type: "dir" });
        if (depth < 4) walk(full, depth + 1);
      } else if (st.isFile()) {
        entries.push({ path: rel, type: "file", size: st.size });
      } else {
        entries.push({ path: rel, type: "other" });
      }
    }
  }

  if (existsSync(abs) && statSync(abs).isDirectory()) {
    walk(abs, 0);
  } else if (existsSync(abs)) {
    const st = statSync(abs);
    entries.push({
      path: relative(workspaceRoot, abs),
      type: st.isFile() ? "file" : "other",
      size: st.isFile() ? st.size : undefined,
    });
  }

  return {
    kind: "FileListResult",
    root: relative(workspaceRoot, abs) || ".",
    entries,
    truncated,
  };
}

export function filesystemSearch(
  workspaceRoot: string,
  pattern: string,
  pathInput = ".",
): FileSearchResult {
  const abs = resolveWorkspacePath(workspaceRoot, pathInput);
  const matches: FileSearchResult["matches"] = [];
  let truncated = false;
  const lower = pattern.toLowerCase();

  function walk(dir: string): void {
    if (matches.length >= MAX_SEARCH) {
      truncated = true;
      return;
    }
    let names: string[];
    try {
      names = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of names) {
      if (matches.length >= MAX_SEARCH) {
        truncated = true;
        return;
      }
      if (name === "node_modules" || name === ".git") continue;
      const full = join(dir, name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      const rel = relative(workspaceRoot, full);
      if (st.isDirectory()) {
        walk(full);
        continue;
      }
      if (!st.isFile()) continue;
      if (name.toLowerCase().includes(lower)) {
        matches.push({ path: rel });
        continue;
      }
      if (st.size > 1_000_000) continue;
      try {
        const text = readFileSync(full, "utf-8");
        const lines = text.split("\n");
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(lower)) {
            matches.push({
              path: rel,
              line: i + 1,
              excerpt: cleanOutput(lines[i], 200),
            });
            if (matches.length >= MAX_SEARCH) {
              truncated = true;
              return;
            }
            break;
          }
        }
      } catch {
        /* binary / unreadable */
      }
    }
  }

  if (existsSync(abs)) walk(statSync(abs).isDirectory() ? abs : join(abs, ".."));

  return {
    kind: "FileSearchResult",
    root: relative(workspaceRoot, abs) || ".",
    pattern,
    matches,
    truncated,
  };
}
