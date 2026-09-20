import type { CapabilityIR, Evidence, GraphNode, GraphSnapshot } from "../types/index.js";
import type { FailureClassification, FailureDisposition } from "./failure-class.js";

export type ReplanStrategy =
  | "RETRY_WITH_CHANGED_PROVIDER"
  | "REPLACE_FAILED_CAPABILITY"
  | "ABORT_AND_ESCALATE";

export interface ReplanInput {
  execution_id: string;
  feature_id: string;
  current_plan: CapabilityIR;
  graph: GraphSnapshot;
  failed_node?: GraphNode;
  failure: FailureClassification;
  attempt: number;
  replan_count: number;
  max_replans: number;
  completed_node_ids: string[];
  available_capabilities: string[];
  /** Provider ids known for the failed capability (from registry). */
  available_providers: string[];
  /** Provider that failed (to exclude). */
  failed_provider_id?: string;
  policy_id: string;
  recent_plan_hashes: string[];
  last_failure_signature?: string;
}

export type ReplanResult =
  | {
      status: "REPLAN_PROPOSED";
      candidate_ir: CapabilityIR;
      reason: string;
      strategy: ReplanStrategy;
      replan_id: string;
      evidence?: Evidence;
    }
  | {
      status: "REPLAN_REJECTED";
      reason: string;
      code?: string;
    }
  | {
      status: "REPLAN_UNAVAILABLE";
      reason: string;
      code?: string;
    };

export interface Replanner {
  replan(input: ReplanInput): Promise<ReplanResult> | ReplanResult;
}

export interface ShouldReplanDecision {
  should: boolean;
  disposition: FailureDisposition;
  reason: string;
  code?:
    | "SHOULD_REPLAN"
    | "USE_RETRY"
    | "POLICY_BLOCKED"
    | "HUMAN_REQUIRED"
    | "FATAL"
    | "REPLAN_EXHAUSTED"
    | "NO_PROGRESS";
}
