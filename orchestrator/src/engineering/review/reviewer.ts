/**
 * EngineeringReviewer — structured review runtime (deterministic + optional agent findings).
 * Never executes Providers/Capabilities/filesystem/shell.
 */

import { randomUUID } from "node:crypto";
import type { EventBus } from "../../events/event-bus.js";
import type { AgentExecutor } from "../../agent/types.js";
import { assembleAgentExecutionRequest } from "../../agent/context-assembler.js";
import { runDeterministicChecks, statusFromFindings } from "./checks.js";
import {
  buildDiffSummary,
  implementationVersionFingerprint,
  tryGitDiffExcerpt,
} from "./diff.js";
import { buildReviewEvidence, fingerprintReview } from "./evidence.js";
import { ForbiddenReviewerExecutor } from "./forbidden.js";
import {
  assertReviewIndependence,
  DETERMINISTIC_REVIEWER_ID,
  DETERMINISTIC_REVIEWER_VERSION,
} from "./independence.js";
import { ReviewStore } from "./store.js";
import { emitReviewTelemetry } from "./telemetry.js";
import type {
  EngineeringReviewRequest,
  EngineeringReviewResult,
  ReviewFinding,
  ReviewCheckpoint,
} from "./types.js";

export interface EngineeringReviewerOptions {
  store: ReviewStore;
  eventBus?: EventBus;
  agentExecutor?: AgentExecutor;
  /** Injected agent findings merger for hybrid/agent mode tests */
  agentFindingsFactory?: (req: EngineeringReviewRequest) => ReviewFinding[];
}

export class EngineeringReviewer {
  private store: ReviewStore;
  private bus?: EventBus;
  private executor?: AgentExecutor;
  private agentFindingsFactory?: EngineeringReviewerOptions["agentFindingsFactory"];

  constructor(options: EngineeringReviewerOptions) {
    this.store = options.store;
    this.bus = options.eventBus;
    this.executor = options.agentExecutor;
    this.agentFindingsFactory = options.agentFindingsFactory;
  }

  /** Expose forbidden surface for adversarial tests */
  get forbidden() {
    return ForbiddenReviewerExecutor;
  }

  recover(reviewId: string): ReviewCheckpoint | null {
    const cp = this.store.load(reviewId);
    if (!cp) return null;
    if (cp.phase === "COMPLETED" || cp.phase === "INVALIDATED") return cp;
    const next: ReviewCheckpoint = {
      ...cp,
      phase: "RECOVERING",
      updated_at: new Date().toISOString(),
    };
    this.store.save(next);
    emitReviewTelemetry(this.bus, "ReviewRecovered", cp.review_id, { review_id: reviewId });
    return next;
  }

  async review(req: EngineeringReviewRequest): Promise<{
    result: EngineeringReviewResult;
    evidence?: ReturnType<typeof buildReviewEvidence>;
    replayed?: boolean;
    invalidated_prior?: boolean;
  }> {
    // Binding / isolation checks
    if (!req.task_id || !req.assignment_id || !req.implementation_execution_id) {
      return {
        result: this.invalid(req, ["missing task/assignment/execution binding"]),
      };
    }

    const reviewerId =
      req.reviewer_agent_id ??
      (req.mode === "deterministic" ? DETERMINISTIC_REVIEWER_ID : req.reviewer_agent_id ?? "");
    const independence = assertReviewIndependence({
      require_independent_review: req.require_independent_review,
      implementer_agent_id: req.agent_id,
      reviewer_agent_id: reviewerId || DETERMINISTIC_REVIEWER_ID,
    });
    if (!independence.ok) {
      return { result: this.invalid(req, [independence.error ?? "independence failed"]) };
    }

    emitReviewTelemetry(this.bus, "ReviewCreated", req.task_id, {
      review_id: req.review_id,
      implementation_version: req.implementation_version,
    });

    const existing = this.store.load(req.review_id);
    if (existing?.phase === "COMPLETED" && existing.result) {
      if (existing.implementation_version !== req.implementation_version) {
        this.store.invalidateStale(req.review_id, req.implementation_version);
        emitReviewTelemetry(this.bus, "ReviewInvalidated", req.task_id, {
          review_id: req.review_id,
          reason: "implementation_version_changed",
        });
      } else if (existing.result.fingerprint) {
        // Idempotent replay
        return { result: existing.result, replayed: true };
      }
    }

    // Stale approval of different version cannot approve current
    if (
      existing?.result?.status === "APPROVED" &&
      existing.implementation_version !== req.implementation_version
    ) {
      emitReviewTelemetry(this.bus, "ReviewInvalidated", req.task_id, {
        review_id: req.review_id,
        prior_version: existing.implementation_version,
      });
    }

    this.store.save({
      kind: "ReviewCheckpoint",
      apiVersion: "evolveloop.io/se/v1",
      review_id: req.review_id,
      phase: "STARTED",
      implementation_version: req.implementation_version,
      fingerprints: existing?.fingerprints ?? [],
      updated_at: new Date().toISOString(),
    });
    emitReviewTelemetry(this.bus, "ReviewStarted", req.task_id, { review_id: req.review_id });

    if (req.mode === "agent" && !this.executor && !this.agentFindingsFactory) {
      const result = this.unavailable(req, "Agent review unavailable — no executor");
      emitReviewTelemetry(this.bus, "ReviewBlocked", req.task_id, { reason: "REVIEW_UNAVAILABLE" });
      return { result };
    }

    const diff = buildDiffSummary({
      workspace_root: req.workspace_root,
      changed_files: req.changed_files,
      baseline_contents: req.baseline_contents,
    });
    await tryGitDiffExcerpt(req.workspace_root); // observation best-effort

    let findings = runDeterministicChecks(req, diff);

    if (req.mode === "agent" || req.mode === "hybrid") {
      const agentFindings = await this.collectAgentFindings(req);
      findings = [...findings, ...agentFindings];
    }

    // Findings about files outside authorized task must be rejected as REVIEW_INVALID
    for (const f of findings) {
      if (f.file && f.category !== "scope_violation") {
        const allowed = req.allowed_paths.length ? req.allowed_paths : req.task_scope;
        const inScope = allowed.some((s) => {
          const prefix = s.replace(/\/\*\*$/, "/");
          return f.file === s || f.file!.startsWith(prefix) || (s.endsWith("/**") && f.file!.startsWith(s.slice(0, -3)));
        });
        if (!inScope && f.file) {
          // Finding references unauthorized file for another task — strip as invalid finding source
          f.description = `[rejected cross-task file ref] ${f.description}`;
          f.blocking = true;
          f.category = "scope_violation";
        }
      }
      emitReviewTelemetry(this.bus, "ReviewFindingCreated", req.task_id, {
        finding_id: f.finding_id,
        severity: f.severity,
        category: f.category,
      });
    }

    const { status, action } = statusFromFindings(findings);
    // Force REPLAN when architecture strategy findings say so
    let recommended = action;
    if (findings.some((f) => /REPLAN_REQUIRED|strategy invalid/i.test(f.description))) {
      recommended = "REPLAN";
    }

    const result: EngineeringReviewResult = {
      kind: "EngineeringReviewResult",
      apiVersion: "evolveloop.io/se/v1",
      review_id: req.review_id,
      status,
      findings,
      evidence_refs: [
        ...(req.evidence_refs ?? []),
        `evidence://review/${req.review_id}`,
      ],
      affected_files: [...new Set(findings.map((f) => f.file).filter((x): x is string => !!x))],
      affected_requirements: [
        ...new Set(findings.map((f) => f.requirement_id).filter((x): x is string => !!x)),
      ],
      affected_architecture_elements: [
        ...new Set(findings.map((f) => f.architecture_element).filter((x): x is string => !!x)),
      ],
      acceptance_criteria_impact: [
        ...new Set(findings.map((f) => f.acceptance_criterion).filter((x): x is string => !!x)),
      ],
      recommended_action: recommended,
      reviewer_identity: {
        reviewer_id: reviewerId || DETERMINISTIC_REVIEWER_ID,
        reviewer_version: req.reviewer_agent_version ?? DETERMINISTIC_REVIEWER_VERSION,
        mode: req.mode,
      },
      review_lineage: {
        implementation_execution_id: req.implementation_execution_id,
        implementation_version: req.implementation_version,
        parent_review_id: existing?.result?.review_id,
        review_attempt: (existing?.fingerprints.length ?? 0) + 1,
      },
      diff_summary: diff,
      produced_at: new Date().toISOString(),
      fingerprint: "",
    };
    result.fingerprint = fingerprintReview({
      review_id: result.review_id,
      status: result.status,
      impl: result.review_lineage.implementation_version,
      findings: result.findings.map((f) => f.finding_id),
    });

    // Approval without evidence when files changed → invalid
    if (
      result.status === "APPROVED" &&
      req.changed_files.length > 0 &&
      result.evidence_refs.length === 0
    ) {
      result.status = "REVIEW_INVALID";
      result.recommended_action = "BLOCK";
      result.findings.push({
        finding_id: `find-${randomUUID().slice(0, 8)}`,
        category: "documentation_gap",
        severity: "BLOCKER",
        description: "Approval without evidence rejected",
        evidence: [],
        blocking: true,
      });
    }

    this.store.recordFingerprint(req.review_id, result.fingerprint, result);

    if (result.status === "BLOCKED") {
      emitReviewTelemetry(this.bus, "ReviewBlocked", req.task_id, { review_id: req.review_id });
    } else if (result.recommended_action === "REPAIR") {
      emitReviewTelemetry(this.bus, "ReviewRepairRequested", req.task_id, {
        review_id: req.review_id,
        findings: result.findings.filter((f) => f.blocking).map((f) => f.finding_id),
      });
    } else if (result.recommended_action === "REPLAN") {
      emitReviewTelemetry(this.bus, "ReviewReplanRequested", req.task_id, {
        review_id: req.review_id,
      });
    }
    emitReviewTelemetry(this.bus, "ReviewCompleted", req.task_id, {
      review_id: req.review_id,
      status: result.status,
      action: result.recommended_action,
    });

    const evidence = buildReviewEvidence(req, result);
    return { result, evidence };
  }

  private async collectAgentFindings(req: EngineeringReviewRequest): Promise<ReviewFinding[]> {
    if (this.agentFindingsFactory) {
      return this.agentFindingsFactory(req);
    }
    if (!this.executor) return [];

    // Agent only reasons — no write authority in request
    const agentReq = assembleAgentExecutionRequest({
      execution_id: `review-agent-${req.review_id}`,
      task_id: req.task_id,
      agent_id: req.reviewer_agent_id ?? "reviewer-agent",
      agent_version: req.reviewer_agent_version ?? "0.1.0",
      role: "reviewer",
      objective: `Produce structured review findings JSON for task ${req.task_id}. Do not execute tools.`,
      decision_mode: "ANSWER",
      policy_summary: { policy_id: req.policy_id, fail_fast: true },
      workspace_authority_summary: {
        allow_write: false,
        allow_shell: false,
        allow_network: false,
      },
      available_capabilities: [],
    });
    const exec = await this.executor.execute(agentReq);
    if (!exec.success || !exec.decision) {
      return [
        {
          finding_id: `find-${randomUUID().slice(0, 8)}`,
          category: "documentation_gap",
          severity: "HIGH",
          description: `Agent review failed: ${exec.error?.message ?? "no decision"}`,
          evidence: ["agent_review_failed"],
          blocking: true,
        },
      ];
    }
    // Agent decision is informational — we do not trust free-text APPROVED
    if (exec.decision.decision_type === "FINAL_RESPONSE") {
      return []; // deterministic checks remain authoritative
    }
    return [];
  }

  private invalid(req: EngineeringReviewRequest, errors: string[]): EngineeringReviewResult {
    return {
      kind: "EngineeringReviewResult",
      apiVersion: "evolveloop.io/se/v1",
      review_id: req.review_id,
      status: "REVIEW_INVALID",
      findings: errors.map((description) => ({
        finding_id: `find-${randomUUID().slice(0, 8)}`,
        category: "documentation_gap" as const,
        severity: "BLOCKER" as const,
        description,
        evidence: ["review_invalid"],
        blocking: true,
      })),
      evidence_refs: [],
      affected_files: [],
      affected_requirements: [],
      affected_architecture_elements: [],
      acceptance_criteria_impact: [],
      recommended_action: "BLOCK",
      reviewer_identity: {
        reviewer_id: DETERMINISTIC_REVIEWER_ID,
        reviewer_version: DETERMINISTIC_REVIEWER_VERSION,
        mode: req.mode,
      },
      review_lineage: {
        implementation_execution_id: req.implementation_execution_id,
        implementation_version: req.implementation_version,
        review_attempt: 1,
      },
      diff_summary: [],
      produced_at: new Date().toISOString(),
      fingerprint: fingerprintReview({ invalid: errors }),
    };
  }

  private unavailable(req: EngineeringReviewRequest, reason: string): EngineeringReviewResult {
    return {
      ...this.invalid(req, [reason]),
      status: "REVIEW_UNAVAILABLE",
      recommended_action: "BLOCK",
    };
  }
}

export function buildReviewRequest(
  partial: Omit<EngineeringReviewRequest, "kind" | "apiVersion" | "review_id"> & {
    review_id?: string;
  },
): EngineeringReviewRequest {
  const diff = buildDiffSummary({
    workspace_root: partial.workspace_root,
    changed_files: partial.changed_files,
    baseline_contents: partial.baseline_contents,
  });
  const implVersion =
    partial.implementation_version ||
    implementationVersionFingerprint(partial.implementation_execution_id, diff);
  return {
    kind: "EngineeringReviewRequest",
    apiVersion: "evolveloop.io/se/v1",
    review_id: partial.review_id ?? `rev-${randomUUID()}`,
    ...partial,
    implementation_version: implVersion,
  };
}

export { implementationVersionFingerprint };
