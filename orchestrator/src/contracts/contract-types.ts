import type { NodeType } from "../types/index.js";

export interface ContractDocument {
  apiVersion: string;
  kind: "Contract";
  metadata: {
    id: string;
    version: string;
    status?: "active" | "deprecated" | "retired";
    deprecated_at?: string;
    superseded_by?: string;
    sunset_at?: string;
  };
  spec: {
    capability: string;
    type: NodeType;
    semver?: { major: number; minor: number; patch: number };
    compatible_with?: string[];
    breaking_changes?: Array<{ version: string; description: string; migration?: string }>;
    inputs?: Array<{ name: string; schema?: string; required?: boolean }>;
    outputs?: Array<{ name: string; schema?: string }>;
    definition_of_done?: { schema?: string; minimum_checks?: string[] };
    evidence?: { schema?: string };
    /** Optional authority / cost metadata for deterministic & side-effecting caps */
    permissions?: {
      filesystem?: "none" | "read" | "write";
      network?: boolean;
      shell?: boolean;
    };
    side_effects?: boolean;
    deterministic?: boolean;
    requires_confirmation?: boolean;
    timeout?: string;
    retry_policy?: { max?: number };
    cost?: {
      latency?: "low" | "medium" | "high";
      token_cost?: "none" | "low" | "high";
      compute_cost?: "low" | "medium" | "high";
      network_cost?: "none" | "low" | "high";
      risk?: "low" | "medium" | "high";
    };
    provider_requirements?: { plugin?: string };
  };
}

export interface ContractCompatibilityResult {
  compatible: boolean;
  reason?: string;
  via_compatible_with?: boolean;
}
