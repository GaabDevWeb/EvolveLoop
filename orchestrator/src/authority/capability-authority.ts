/**
 * CapabilityAuthority — allow | deny | confirm for operational capabilities.
 * Distinct from PolicyEngine (retries, gates, provider strategy).
 */

import { resolve } from "node:path";

export type AuthorityDecision = "allow" | "deny" | "confirm";

export interface AuthorityContext {
  confirmed?: boolean;
  allowShell?: boolean;
  allowWrite?: boolean;
  allowNetwork?: boolean;
  allowHostInspect?: boolean;
  workspaceRoot?: string;
}

/**
 * Policy grants are the ceiling. A request may narrow them.
 * It cannot add shell, write, network, host inspect, or confirmation.
 */
export function effectiveAuthority(
  policy: AuthorityContext,
  requested?: AuthorityContext,
): AuthorityContext {
  const keep = (granted: boolean | undefined, requestedFlag: boolean | undefined): boolean =>
    granted === true && requestedFlag !== false;
  return {
    workspaceRoot: policy.workspaceRoot,
    allowShell: keep(policy.allowShell, requested?.allowShell),
    allowWrite: keep(policy.allowWrite, requested?.allowWrite),
    allowNetwork: keep(policy.allowNetwork, requested?.allowNetwork),
    allowHostInspect: keep(policy.allowHostInspect, requested?.allowHostInspect),
    confirmed: policy.confirmed === true && requested?.confirmed !== false,
  };
}

export interface AuthorityRequest {
  capability: string;
  permissions?: {
    filesystem?: "none" | "read" | "write";
    network?: boolean;
    shell?: boolean;
  };
  side_effects?: boolean;
  deterministic?: boolean;
  requires_confirmation?: boolean;
  targetPath?: string;
  context?: AuthorityContext;
}

export interface AuthorityResult {
  decision: AuthorityDecision;
  reason: string;
  checked_at: string;
  evidence: {
    type: "authority";
    capability: string;
    decision: AuthorityDecision;
    reason: string;
    permissions?: AuthorityRequest["permissions"];
    context_flags: {
      confirmed: boolean;
      allowShell: boolean;
      allowWrite: boolean;
      allowNetwork: boolean;
      allowHostInspect: boolean;
    };
  };
}

export function pathEscapesWorkspace(
  targetPath: string | undefined,
  workspaceRoot: string | undefined,
): boolean {
  if (!targetPath || !workspaceRoot) return false;
  const root = resolve(workspaceRoot);
  const resolved = resolve(root, targetPath);
  return !(resolved === root || resolved.startsWith(root + "/"));
}

function isShell(req: AuthorityRequest): boolean {
  return req.capability === "shell.execute" || !!req.permissions?.shell;
}

function isWrite(req: AuthorityRequest): boolean {
  return (
    req.capability === "filesystem.write" ||
    req.permissions?.filesystem === "write" ||
    req.capability.endsWith(".write")
  );
}

function isNetwork(req: AuthorityRequest): boolean {
  if (req.capability.startsWith("knowledge.")) return false;
  return !!req.permissions?.network || req.capability.startsWith("browser.");
}

function isHostInspect(req: AuthorityRequest): boolean {
  return req.capability.startsWith("system.") || req.capability.startsWith("knowledge.");
}

function isReadOnly(req: AuthorityRequest): boolean {
  if (isShell(req) || isWrite(req) || isNetwork(req)) return false;
  if (req.side_effects) return false;
  const fs = req.permissions?.filesystem ?? "read";
  return fs === "none" || fs === "read";
}

export function authorize(request: AuthorityRequest): AuthorityResult {
  const ctx = request.context ?? {};
  const flags = {
    confirmed: ctx.confirmed === true,
    allowShell: ctx.allowShell === true,
    allowWrite: ctx.allowWrite === true,
    allowNetwork: ctx.allowNetwork === true,
    allowHostInspect: ctx.allowHostInspect === true,
  };
  const checked_at = new Date().toISOString();

  const build = (decision: AuthorityDecision, reason: string): AuthorityResult => ({
    decision,
    reason,
    checked_at,
    evidence: {
      type: "authority",
      capability: request.capability,
      decision,
      reason,
      permissions: request.permissions,
      context_flags: flags,
    },
  });

  if (pathEscapesWorkspace(request.targetPath, ctx.workspaceRoot)) {
    return build("deny", "path_escape_denied");
  }

  if (request.requires_confirmation && !flags.confirmed && !isShell(request) && !isWrite(request)) {
    return build("confirm", "requires_confirmation");
  }

  if (isShell(request)) {
    if (!flags.allowShell) return build("deny", "shell_denied_by_context");
    return build("allow", "shell_allowed_by_context");
  }

  if (isWrite(request)) {
    if (!flags.allowWrite) return build("deny", "write_denied_by_context");
    return build("allow", "write_allowed_by_context");
  }

  if (isNetwork(request)) {
    if (!flags.allowNetwork) return build("deny", "network_denied_by_context");
    return build("allow", "network_allowed_by_context");
  }

  if (isHostInspect(request)) {
    if (!flags.allowHostInspect) return build("deny", "host_inspect_denied");
    return build("allow", "host_inspect_allowed_by_context");
  }

  if (isReadOnly(request)) {
    return build("allow", "deterministic_read_only");
  }

  if (request.side_effects) {
    if (!flags.allowWrite) return build("deny", "side_effects_denied");
    return build("allow", "side_effects_allowed_by_context");
  }

  return build("allow", "default_allow");
}

export class CapabilityAuthority {
  authorize(request: AuthorityRequest): AuthorityResult {
    return authorize(request);
  }
}

export function createCapabilityAuthority(): CapabilityAuthority {
  return new CapabilityAuthority();
}
