import type { RawObservation, SignalType } from "../types.js";

let seq = 0;

function ts(offsetHours = 0): string {
  return new Date(Date.now() - offsetHours * 3600_000).toISOString();
}

function obs(partial: Omit<RawObservation, "id"> & { id?: string }): RawObservation {
  seq += 1;
  return {
    id: partial.id ?? `obs-${seq}`,
    ...partial,
  };
}

/** Synthetic fixtures — explicitly classified as synthetic. */
export const SyntheticFixtures = {
  repeatedFailure(user = "user-a", domain = "sql", n = 3): RawObservation[] {
    return Array.from({ length: n }, (_, i) =>
      obs({
        timestamp: ts(i),
        source: "execution",
        synthetic: true,
        execution_id: `exec-fail-${i}`,
        user_id: user,
        domain,
        task_class: "complex_query",
        kind: "failure",
        severity: "HIGH",
        evidence_refs: [`ev-fail-${i}`],
      }),
    );
  },

  singleIsolatedFailure(): RawObservation[] {
    return [
      obs({
        timestamp: ts(0),
        source: "execution",
        synthetic: true,
        execution_id: "exec-one-off",
        user_id: "user-a",
        domain: "sql",
        task_class: "complex_query",
        kind: "failure",
        severity: "HIGH",
      }),
    ];
  },

  repeatedCorrection(): RawObservation[] {
    return Array.from({ length: 3 }, (_, i) =>
      obs({
        timestamp: ts(i),
        source: "user_feedback",
        synthetic: true,
        execution_id: `exec-corr-${i}`,
        user_id: "user-a",
        domain: "docs",
        task_class: "api_docs",
        kind: "correction",
        severity: "MEDIUM",
        evidence_refs: [`ev-corr-${i}`],
      }),
    );
  },

  capabilityGap(): RawObservation[] {
    return Array.from({ length: 3 }, (_, i) =>
      obs({
        timestamp: ts(i),
        source: "telemetry",
        synthetic: true,
        execution_id: `exec-cap-${i}`,
        project_id: "proj-1",
        domain: "filesystem",
        task_class: "sandbox_exec",
        kind: "capability_unavailable",
        severity: "HIGH",
      }),
    );
  },

  skillGap(): RawObservation[] {
    return Array.from({ length: 3 }, (_, i) =>
      obs({
        timestamp: ts(i),
        source: "execution",
        synthetic: true,
        execution_id: `exec-skill-${i}`,
        user_id: "user-a",
        domain: "frontend",
        task_class: "css_layout",
        kind: "skill_failure",
        severity: "MEDIUM",
      }),
    );
  },

  humanIntervention(): RawObservation[] {
    return Array.from({ length: 3 }, (_, i) =>
      obs({
        timestamp: ts(i),
        source: "user_feedback",
        synthetic: true,
        execution_id: `exec-hitl-${i}`,
        user_id: "user-a",
        domain: "deploy",
        task_class: "prod_deploy",
        kind: "human_intervention",
        severity: "HIGH",
      }),
    );
  },

  policyBlock(): RawObservation[] {
    return Array.from({ length: 3 }, (_, i) =>
      obs({
        timestamp: ts(i),
        source: "system",
        synthetic: true,
        execution_id: `exec-pol-${i}`,
        user_id: "user-a",
        domain: "shell",
        task_class: "rm_rf",
        kind: "policy_block",
        severity: "HIGH",
      }),
    );
  },

  evalGap(): RawObservation[] {
    return Array.from({ length: 3 }, (_, i) =>
      obs({
        timestamp: ts(i),
        source: "eval",
        synthetic: true,
        execution_id: `exec-eval-${i}`,
        domain: "evals",
        task_class: "live_task_success",
        kind: "eval_gap",
        severity: "LOW",
      }),
    );
  },

  /** Same symptom (failure) but for root-cause diversity tests — skill_failure vs capability */
  sameSymptomDifferentCauses(): { skill: RawObservation[]; capability: RawObservation[] } {
    return {
      skill: SyntheticFixtures.skillGap(),
      capability: SyntheticFixtures.capabilityGap(),
    };
  },

  /** Cross-user / cross-project → CORE_CANDIDATE classification */
  coreAggregate(): RawObservation[] {
    const kinds: SignalType[] = ["failure", "failure", "failure"];
    return kinds.flatMap((kind, i) =>
      obs({
        timestamp: ts(i),
        source: "execution",
        synthetic: true,
        execution_id: `exec-core-${i}`,
        user_id: `user-${i}`,
        project_id: `proj-${i % 2}`,
        domain: "sql",
        task_class: "complex_query",
        kind,
        severity: "HIGH",
        // Force SYSTEM scope aggregation via multiple users — pattern detector uses user count
      }),
    );
  },

  endToEndBundle(): RawObservation[] {
    return [
      ...SyntheticFixtures.repeatedFailure("user-a", "sql", 3),
      ...SyntheticFixtures.repeatedCorrection().slice(0, 0), // keep focused
      ...Array.from({ length: 2 }, (_, i) =>
        obs({
          timestamp: ts(i),
          source: "user_feedback",
          synthetic: true,
          execution_id: `exec-e2e-hitl-${i}`,
          user_id: "user-a",
          domain: "sql",
          task_class: "complex_query",
          kind: "human_intervention",
          severity: "HIGH",
        }),
      ),
    ];
  },
};

export function resetSyntheticSeq(): void {
  seq = 0;
}
