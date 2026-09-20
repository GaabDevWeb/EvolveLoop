import { createHash } from "node:crypto";
import type { Requirement } from "./types.js";

/** Canonical content fingerprint — not human identity (REQ-001). */
export function computeRequirementHash(
  req: Pick<
    Requirement,
    "title" | "description" | "type" | "priority" | "acceptance_criteria" | "dependencies"
  >,
): string {
  const canonical = JSON.stringify({
    title: req.title.trim(),
    description: req.description.trim(),
    type: req.type,
    priority: req.priority,
    acceptance_criteria: [...(req.acceptance_criteria ?? [])].map((s) => s.trim()).sort(),
    dependencies: [...(req.dependencies ?? [])].sort(),
  });
  return createHash("sha256").update(canonical).digest("hex").slice(0, 16);
}
