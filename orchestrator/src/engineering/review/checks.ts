/**
 * Deterministic review checks — mechanical, no LLM.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { assertWorkspaceOpScope, isForbiddenPath, normalizeRel } from "../scope.js";
import type { EngineeringReviewRequest, ReviewFinding, DiffFileSummary } from "./types.js";

function finding(
  partial: Omit<ReviewFinding, "finding_id"> & { finding_id?: string },
): ReviewFinding {
  return {
    finding_id: partial.finding_id ?? `find-${randomUUID().slice(0, 8)}`,
    ...partial,
  };
}

const SECRET_RE =
  /\b(AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{36}|xox[baprs]-[A-Za-z0-9-]{10,}|-----BEGIN (RSA |OPENSSH )?PRIVATE KEY-----|api[_-]?key\s*[:=]\s*['\"][^'\"]{8,})\b/i;

const UNSAFE_SHELL_RE = /\b(child_process|execSync|spawn\(|rm\s+-rf\s+\/|eval\(|Function\()\b/;
const PATH_TRAVERSAL_RE = /\.\.\/|\.\.\\/;
const POLICY_MUTATION_RE = /policy.*(bypass|disable|ignore)|unrestricted\.(shell|filesystem|network)/i;

export function runDeterministicChecks(
  req: EngineeringReviewRequest,
  diff: DiffFileSummary[],
): ReviewFinding[] {
  const findings: ReviewFinding[] = [];

  // Scope
  for (const f of diff) {
    const scope = assertWorkspaceOpScope(f.path, {
      workspace_root: req.workspace_root,
      allowed_paths: req.allowed_paths.length ? req.allowed_paths : req.task_scope,
      forbidden_paths: req.forbidden_paths,
    });
    if (!scope.ok) {
      findings.push(
        finding({
          category: "scope_violation",
          severity: "BLOCKER",
          description: `Changed file outside task scope: ${f.path} (${scope.errors.join("; ")})`,
          evidence: [`diff:${f.path}`, ...scope.errors],
          file: f.path,
          blocking: true,
          suggested_remediation: "Revert unauthorized path or expand task scope via replan",
        }),
      );
    }
    if (isForbiddenPath(normalizeRel(f.path), req.forbidden_paths)) {
      findings.push(
        finding({
          category: "security",
          severity: "BLOCKER",
          description: `Forbidden path modified: ${f.path}`,
          evidence: [`path:${f.path}`],
          file: f.path,
          blocking: true,
        }),
      );
    }
  }

  // Expected outputs present
  for (const p of req.expected_outputs ?? []) {
    if (!existsSync(join(req.workspace_root, p))) {
      findings.push(
        finding({
          category: "correctness",
          severity: "HIGH",
          description: `Expected output missing after implementation: ${p}`,
          evidence: [`missing:${p}`],
          file: p,
          blocking: true,
          suggested_remediation: `Create or restore ${p}`,
        }),
      );
    }
  }

  // Test review
  if (!req.tests_executed.length) {
    findings.push(
      finding({
        category: "testing_gap",
        severity: "BLOCKER",
        description: "No runtime-verified tests executed for this implementation",
        evidence: ["tests:none"],
        blocking: true,
      }),
    );
  } else {
    for (const t of req.tests_executed) {
      if (!t.verified_by_runtime) {
        findings.push(
          finding({
            category: "testing_gap",
            severity: "BLOCKER",
            description: `Fake/unverified test result rejected: ${t.command}`,
            evidence: [`test:${t.execution_id}`],
            blocking: true,
          }),
        );
      }
      if (!t.passed) {
        findings.push(
          finding({
            category: "regression",
            severity: "BLOCKER",
            description: `Required test failed: ${t.command} exit=${t.exit_code}`,
            evidence: [`test:${t.execution_id}`, t.stderr_excerpt ?? ""],
            blocking: true,
            suggested_remediation: "Repair implementation until tests pass",
          }),
        );
      }
    }
  }

  // Read changed file contents for security + pattern checks
  for (const f of diff) {
    if (f.change === "deleted") continue;
    const abs = join(req.workspace_root, f.path);
    if (!existsSync(abs)) continue;
    let content = "";
    try {
      content = readFileSync(abs, "utf-8");
    } catch {
      continue;
    }

    if (SECRET_RE.test(content)) {
      findings.push(
        finding({
          category: "security",
          severity: "BLOCKER",
          description: `Possible secret/credential material in ${f.path}`,
          evidence: [`secret_pattern:${f.path}`],
          file: f.path,
          blocking: true,
          suggested_remediation: "Remove secrets; use env/secret store",
        }),
      );
    }
    if (UNSAFE_SHELL_RE.test(content)) {
      findings.push(
        finding({
          category: "security",
          severity: "HIGH",
          description: `Suspicious process/shell usage in ${f.path}`,
          evidence: [`unsafe_shell:${f.path}`],
          file: f.path,
          blocking: true,
        }),
      );
    }
    if (PATH_TRAVERSAL_RE.test(content) && /\.\.\//.test(content)) {
      findings.push(
        finding({
          category: "security",
          severity: "MEDIUM",
          description: `Path traversal pattern in ${f.path}`,
          evidence: [`traversal:${f.path}`],
          file: f.path,
          blocking: false,
        }),
      );
    }
    if (POLICY_MUTATION_RE.test(content)) {
      findings.push(
        finding({
          category: "security",
          severity: "BLOCKER",
          description: `Possible policy bypass / unrestricted capability language in ${f.path}`,
          evidence: [`policy_mutation:${f.path}`],
          file: f.path,
          blocking: true,
        }),
      );
    }

    // Prompt-injection directed at reviewers (adversarial)
    if (/ignore (all )?(previous|prior) (instructions|review)|SYSTEM OVERRIDE.*review/i.test(content)) {
      findings.push(
        finding({
          category: "security",
          severity: "HIGH",
          description: `Prompt-injection / reviewer-manipulation text in ${f.path}`,
          evidence: [`injection:${f.path}`],
          file: f.path,
          blocking: true,
        }),
      );
    }
  }

  // Required content patterns (requirement / acceptance linkage)
  const allContent = diff
    .filter((d) => d.change !== "deleted")
    .map((d) => {
      const abs = join(req.workspace_root, d.path);
      return existsSync(abs) ? readFileSync(abs, "utf-8") : "";
    })
    .join("\n");

  for (const reqPat of req.required_content_patterns ?? []) {
    const re = new RegExp(reqPat.pattern);
    if (!re.test(allContent)) {
      findings.push(
        finding({
          category: "requirement_mismatch",
          severity: "BLOCKER",
          description: reqPat.description,
          evidence: [`pattern_missing:${reqPat.pattern}`],
          requirement_id: reqPat.requirement_id,
          acceptance_criterion: reqPat.description,
          blocking: true,
          suggested_remediation: "Implement missing requirement behavior",
        }),
      );
    }
  }

  for (const bad of req.prohibited_patterns ?? []) {
    const re = new RegExp(bad.pattern);
    if (re.test(allContent)) {
      findings.push(
        finding({
          category: bad.category ?? "correctness",
          severity: "BLOCKER",
          description: bad.description,
          evidence: [`prohibited:${bad.pattern}`],
          blocking: true,
          suggested_remediation: "Remove prohibited pattern",
        }),
      );
    }
  }

  // Requirement traceability: declared requirements without linked evidence in DoD/patterns
  if (req.requirement_ids.length && !(req.required_content_patterns?.length) && !(req.acceptance_criteria.length)) {
    findings.push(
      finding({
        category: "requirement_mismatch",
        severity: "MEDIUM",
        description: "Requirements declared but no acceptance criteria or required patterns for review",
        evidence: req.requirement_ids.map((id) => `req:${id}`),
        blocking: false,
      }),
    );
  }

  // Architecture constraints (simple substring / id presence)
  for (const c of req.architecture_constraints ?? []) {
    if (c.startsWith("forbid:") && allContent.includes(c.slice("forbid:".length))) {
      findings.push(
        finding({
          category: "architecture_violation",
          severity: "BLOCKER",
          description: `Architecture forbid violated: ${c}`,
          evidence: [`arch:${c}`],
          architecture_element: c,
          blocking: true,
        }),
      );
    }
    if (c.startsWith("require:") && !allContent.includes(c.slice("require:".length))) {
      findings.push(
        finding({
          category: "architecture_violation",
          severity: "HIGH",
          description: `Architecture require missing: ${c}`,
          evidence: [`arch:${c}`],
          architecture_element: c,
          blocking: true,
        }),
      );
    }
  }

  // Reviewer must not claim approval without evidence refs when files changed
  if (req.changed_files.length && !(req.evidence_refs?.length) && diff.every((d) => d.change === "unchanged")) {
    findings.push(
      finding({
        category: "documentation_gap",
        severity: "LOW",
        description: "No evidence refs and no observable content change",
        evidence: ["evidence:thin"],
        blocking: false,
      }),
    );
  }

  return findings;
}

export function statusFromFindings(findings: ReviewFinding[]): {
  status: import("./types.js").EngineeringReviewStatus;
  action: import("./types.js").ReviewRecommendedAction;
} {
  if (findings.some((f) => f.category === "scope_violation" && f.blocking)) {
    return { status: "BLOCKED", action: "BLOCK" };
  }
  if (findings.some((f) => f.blocking && f.severity === "BLOCKER")) {
    if (findings.some((f) => /REPLAN_REQUIRED|strategy invalid/i.test(f.description))) {
      return { status: "CHANGES_REQUIRED", action: "REPLAN" };
    }
    return { status: "CHANGES_REQUIRED", action: "REPAIR" };
  }
  if (findings.some((f) => f.blocking)) {
    return { status: "CHANGES_REQUIRED", action: "REPAIR" };
  }
  return { status: "APPROVED", action: "NONE" };
}
