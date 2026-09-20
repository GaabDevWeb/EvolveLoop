import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { ProjectInspectResult } from "../../capabilities/results.js";
import { gitInspect } from "./git.js";
import { resolveWorkspacePath } from "./paths.js";

export async function projectInspect(
  workspaceRoot: string,
  pathInput = ".",
): Promise<ProjectInspectResult> {
  const root = resolveWorkspacePath(workspaceRoot, pathInput);
  const manifests: string[] = [];
  const entrypoints: string[] = [];

  const pkgPath = join(root, "package.json");
  let name: string | undefined;
  let packageManager: string | undefined;

  if (existsSync(pkgPath)) {
    manifests.push("package.json");
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
        name?: string;
        scripts?: Record<string, string>;
        packageManager?: string;
      };
      name = pkg.name;
      packageManager = pkg.packageManager?.split("@")[0] ?? "npm";
      if (pkg.scripts?.start) entrypoints.push("npm start");
      if (pkg.scripts?.dev) entrypoints.push("npm run dev");
      if (pkg.scripts?.test) entrypoints.push("npm test");
    } catch {
      /* ignore malformed package.json */
    }
  }

  for (const f of ["README.md", "readme.md", "pyproject.toml", "Cargo.toml", "go.mod"]) {
    if (existsSync(join(root, f))) manifests.push(f);
  }

  if (existsSync(join(root, "pnpm-lock.yaml"))) packageManager = packageManager ?? "pnpm";
  else if (existsSync(join(root, "yarn.lock"))) packageManager = packageManager ?? "yarn";
  else if (existsSync(join(root, "package-lock.json"))) packageManager = packageManager ?? "npm";

  const hasGit = existsSync(join(root, ".git"));
  let hasTests = false;
  try {
    const names = readdirSync(root);
    hasTests =
      names.some((n) => n === "tests" || n === "test" || n === "__tests__") ||
      existsSync(join(root, "vitest.config.ts")) ||
      existsSync(join(root, "jest.config.js"));
  } catch {
    /* ignore */
  }

  const repository = hasGit ? await gitInspect(workspaceRoot, pathInput) : undefined;

  return {
    kind: "ProjectInspectResult",
    root,
    name,
    package_manager: packageManager,
    has_git: hasGit,
    has_tests: hasTests,
    entrypoints,
    manifests,
    repository,
  };
}
