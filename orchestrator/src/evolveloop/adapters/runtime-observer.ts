/**
 * Non-blocking EventBus → ingest → optional LiveAnalysisCoordinator notify.
 * Never throws to the emit path; never calls analyze() directly (coordinator owns cadence).
 */

import type { EventBus } from "../../events/event-bus.js";
import type { EventEnvelope } from "../../types/index.js";
import type { LongitudinalEvolveLoop } from "../longitudinal-controller.js";
import type { AnalysisScope } from "../longitudinal-types.js";
import type { RawObservation, SignalSeverity, SignalType } from "../types.js";
import {
  deriveScopeFromObservation,
  type LiveAnalysisCoordinator,
} from "../live/live-coordinator.js";
import { SignalMiner } from "../signal-miner.js";

/** Coverage class for EventBus → EvolveLoop mapping. */
export type EventCoverageMode =
  | "TRIGGER"
  | "BATCH"
  | "OBSERVE_ONLY"
  | "NOT_MAPPED";

/**
 * Matrix of real EventBus types → EvolveLoop coverage.
 * Only types that produce useful signals are ingested; OBSERVE_ONLY is documented, not persisted.
 */
export const EVENT_COVERAGE: ReadonlyArray<{
  type: string;
  mode: EventCoverageMode;
  note: string;
}> = [
  { type: "NodeFailed", mode: "TRIGGER", note: "failure HIGH → ingest + notify" },
  { type: "FeatureBlocked", mode: "TRIGGER", note: "policy_block HIGH → ingest + notify" },
  { type: "GateRejected", mode: "TRIGGER", note: "policy_block HIGH → ingest + notify" },
  {
    type: "RetryScheduled",
    mode: "BATCH",
    note: "failure MEDIUM + retry metadata; notify without high_severity",
  },
  {
    type: "NodeCompleted",
    mode: "OBSERVE_ONLY",
    note: "not ingested; no useful failure signal",
  },
  {
    type: "FeatureCompleted",
    mode: "OBSERVE_ONLY",
    note: "not ingested; no useful failure signal",
  },
] as const;

const INGEST_TYPES = new Set(
  EVENT_COVERAGE.filter((e) => e.mode === "TRIGGER" || e.mode === "BATCH").map((e) => e.type),
);

function mapEventKind(type: string): SignalType {
  if (type === "FeatureBlocked" || type === "GateRejected") return "policy_block";
  return "failure";
}

function mapEventSeverity(type: string): SignalSeverity {
  if (type === "RetryScheduled") return "MEDIUM";
  return "HIGH";
}

/**
 * Required identity for attach scope. Never invent tenant ids from attach scope —
 * missing identity → reject (null). Attach scope is only used for notify routing
 * via deriveScopeFromObservation after a properly attributed observation exists.
 */
function requiredIdentityPresent(
  scope: AnalysisScope,
  payload: Record<string, unknown>,
  event: EventEnvelope,
): boolean {
  switch (scope.type) {
    case "USER":
      return typeof payload.user_id === "string" && payload.user_id.length > 0;
    case "PROJECT":
      return typeof payload.project_id === "string" && payload.project_id.length > 0;
    case "WORKSPACE": {
      const fid =
        (typeof payload.feature_id === "string" && payload.feature_id) || event.feature_id;
      return typeof fid === "string" && fid.length > 0;
    }
    case "SYSTEM":
      return true;
  }
}

export function eventToRawObservation(
  event: EventEnvelope,
  opts: { scope: AnalysisScope; session_id?: string; domain?: string },
): RawObservation | null {
  if (!INGEST_TYPES.has(event.type)) return null;

  const payload = event.payload ?? {};
  // V1 security: reject unlabeled events for USER/PROJECT/WORKSPACE attach —
  // do not stamp attach-scope identity onto observations (scope fallback LEAK).
  if (!requiredIdentityPresent(opts.scope, payload, event)) {
    return null;
  }

  const capability =
    (payload.capability as string | undefined) ?? opts.domain ?? "unknown";
  const runId =
    (payload.run_id as string | undefined) ?? event.correlation_id ?? event.event_id;

  const isRetry = event.type === "RetryScheduled";

  return {
    id: `rt-${event.event_id}`,
    timestamp: event.timestamp,
    source: "telemetry",
    synthetic: false,
    execution_id: runId,
    feature_id: (payload.feature_id as string | undefined) ?? event.feature_id,
    user_id: payload.user_id as string | undefined,
    project_id: payload.project_id as string | undefined,
    domain: capability,
    task_class: capability,
    kind: mapEventKind(event.type),
    severity: mapEventSeverity(event.type),
    message: typeof payload.reason === "string" ? payload.reason : undefined,
    metadata: {
      session_id: opts.session_id ?? event.feature_id,
      event_type: event.type,
      observation_class: "REAL",
      analysis_scope: opts.scope,
      node_id: payload.node_id,
      provider_id: payload.provider_id,
      ...(isRetry ? { retry: true } : {}),
    },
    evidence_refs: [],
  };
}

export interface AttachObserverOptions {
  /**
   * Attach analysis scope for notify routing when observation already carries
   * matching identity. Does NOT stamp tenant ids onto unlabeled events (V1).
   */
  scope: AnalysisScope;
  session_id?: string;
  domain?: string;
  onError?: (err: unknown) => void;
  /** Optional hook when an ingestible event type is skipped for missing identity. */
  onDeferredIdentity?: (event: EventEnvelope, reason: string) => void;
  /** When set, notify coordinator after ingest (enables automatic analysis). */
  coordinator?: LiveAnalysisCoordinator;
}

/**
 * Subscribe to EventBus and ingest mapped observations.
 * Optional coordinator enables cadence → automatic analyze(scope).
 */
export function attachEvolveLoopObserver(
  eventBus: EventBus,
  loop: LongitudinalEvolveLoop,
  opts: AttachObserverOptions,
): () => void {
  return eventBus.onEvent((event) => {
    try {
      if (INGEST_TYPES.has(event.type)) {
        const payload = event.payload ?? {};
        if (!requiredIdentityPresent(opts.scope, payload, event)) {
          try {
            opts.onDeferredIdentity?.(event, "missing_identity_for_attach_scope");
          } catch {
            /* must not break emit */
          }
          return;
        }
      }

      const obs = eventToRawObservation(event, {
        scope: opts.scope,
        session_id: opts.session_id,
        domain: opts.domain,
      });
      if (!obs) return;

      const result = loop.ingest([obs]);
      if (result.written === 0 && result.rejected === 0 && result.skipped > 0) {
        // duplicate — still may not need analysis
      }

      if (opts.coordinator) {
        // Prefer observation identity; never invent another tenant from attach scope alone.
        const scope = deriveScopeFromObservation(obs, undefined) ??
          (opts.scope.type === "SYSTEM" ? opts.scope : null);
        if (!scope) {
          try {
            opts.onDeferredIdentity?.(event, "unscoped_observation_after_ingest");
          } catch {
            /* must not break emit */
          }
          return;
        }
        const miner = new SignalMiner();
        const signals = miner.mine([obs]);
        // RetryScheduled = BATCH: notify without high_severity so cadence uses normal threshold
        opts.coordinator.notifySignal(scope, {
          high_severity: !obs.metadata?.retry && (obs.severity === "HIGH" || obs.severity === "CRITICAL"),
          signals,
        });
      }
    } catch (err) {
      try {
        opts.onError?.(err);
      } catch {
        /* onError must not break emit */
      }
    }
  });
}

/** Convenience: observer + coordinator in one attach. */
export function attachLiveEvolveLoop(
  eventBus: EventBus,
  loop: LongitudinalEvolveLoop,
  coordinator: LiveAnalysisCoordinator,
  opts: Omit<AttachObserverOptions, "coordinator">,
): () => void {
  return attachEvolveLoopObserver(eventBus, loop, { ...opts, coordinator });
}
