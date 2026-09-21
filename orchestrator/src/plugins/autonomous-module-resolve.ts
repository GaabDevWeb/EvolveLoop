/**
 * Resolve autonomous handler modules under a trusted provider directory.
 *
 * Declaration trust model:
 * - provider.yaml `autonomous.module` is UNTRUSTED input until validated.
 * - Absolute paths, `..` traversal, non-.js/.mjs, and symlink escape → DENY.
 * - This is path confinement + allowlist of extensions — NOT an OS sandbox.
 *   SANDBOX_NOT_IMPLEMENTED: loaded JS still runs with process privileges.
 */

import { existsSync, realpathSync, statSync } from "node:fs";
import { extname, isAbsolute, normalize, resolve, sep } from "node:path";

export const AUTONOMOUS_SANDBOX_STATUS = "SANDBOX_NOT_IMPLEMENTED" as const;

const ALLOWED_EXT = new Set([".mjs", ".js", ".cjs"]);

export type ResolveAutonomousModuleResult =
  | { ok: true; absolutePath: string; relativeDisplay: string }
  | { ok: false; reason: string; code: string };

/**
 * Resolve and confine an autonomous module path to providerDir.
 */
export function resolveAutonomousModule(
  providerDir: string,
  moduleSpec: string,
): ResolveAutonomousModuleResult {
  const spec = moduleSpec?.trim() ?? "";
  if (!spec) {
    return { ok: false, code: "MODULE_SPEC_EMPTY", reason: "autonomous.module is empty" };
  }
  if (isAbsolute(spec)) {
    return {
      ok: false,
      code: "MODULE_ABSOLUTE_DENIED",
      reason: "absolute autonomous.module paths are not allowed",
    };
  }
  const norm = normalize(spec);
  if (norm.startsWith("..") || norm.includes(`${sep}..${sep}`) || norm.includes(`${sep}..`)) {
    return {
      ok: false,
      code: "MODULE_TRAVERSAL_DENIED",
      reason: `path traversal denied in autonomous.module: ${spec}`,
    };
  }
  // Reject URL / protocol tricks
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(spec)) {
    return {
      ok: false,
      code: "MODULE_PROTOCOL_DENIED",
      reason: "protocol-style autonomous.module is not allowed",
    };
  }

  const ext = extname(norm).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    return {
      ok: false,
      code: "MODULE_EXTENSION_DENIED",
      reason: `autonomous.module extension not allowed: ${ext || "(none)"}`,
    };
  }

  let providerReal: string;
  try {
    if (!existsSync(providerDir)) {
      return { ok: false, code: "PROVIDER_DIR_MISSING", reason: `provider dir missing: ${providerDir}` };
    }
    providerReal = realpathSync(providerDir);
  } catch {
    return { ok: false, code: "PROVIDER_DIR_UNREADABLE", reason: `cannot resolve provider dir: ${providerDir}` };
  }

  const candidate = resolve(providerReal, norm);
  // Lexical confinement before realpath
  if (!(candidate === providerReal || candidate.startsWith(providerReal + sep))) {
    return {
      ok: false,
      code: "MODULE_OUTSIDE_PROVIDER",
      reason: `module resolves outside provider directory: ${spec}`,
    };
  }

  if (!existsSync(candidate)) {
    return { ok: false, code: "MODULE_NOT_FOUND", reason: `Autonomous module not found: ${candidate}` };
  }

  try {
    const st = statSync(candidate);
    if (!st.isFile()) {
      return { ok: false, code: "MODULE_NOT_FILE", reason: "autonomous.module must be a regular file" };
    }
    const real = realpathSync(candidate);
    if (!(real === providerReal || real.startsWith(providerReal + sep))) {
      return {
        ok: false,
        code: "MODULE_SYMLINK_ESCAPE",
        reason: `module realpath escapes provider directory: ${spec}`,
      };
    }
    return { ok: true, absolutePath: real, relativeDisplay: norm };
  } catch (err) {
    return {
      ok: false,
      code: "MODULE_RESOLVE_FAILED",
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}
