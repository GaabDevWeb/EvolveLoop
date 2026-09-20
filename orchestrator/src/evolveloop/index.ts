export type {
  AutonomyLevel,
  CandidateType,
  Confidence,
  DetectedPattern,
  EvolutionCandidate,
  EvolutionRequest,
  EvolutionScopeClass,
  EvolutionScopeKind,
  EvolveLoopRunResult,
  LoopState,
  NeedCandidate,
  NeedSignal,
  PatternKind,
  RawObservation,
  RootCauseAnalysis,
  RootCauseType,
  SignalSeverity,
  SignalType,
} from "./types.js";
export { EVOLVE_THRESHOLDS } from "./types.js";
export { SignalMiner } from "./signal-miner.js";
export { PatternDetector } from "./pattern-detector.js";
export { NeedDetector } from "./need-detector.js";
export { RootCauseAnalyzer } from "./root-cause.js";
export { EvolutionCandidateGenerator } from "./candidate-generator.js";
export { CandidateValidator, buildEvolutionRequest } from "./candidate-validator.js";
export { EvolveLoopController, type EvolveLoopOptions } from "./controller.js";
export { EvolveLoopStore, type EvolveLoopStoreSnapshot } from "./store.js";
export { submitEvolutionRequest, PIPELINE_HANDOFF_CONTRACT } from "./handoff/evolution-request.js";
export { SyntheticFixtures, resetSyntheticSeq } from "./adapters/synthetic-fixtures.js";
export {
  LONGITUDINAL_THRESHOLDS,
  WINDOW_HOURS,
  hoursForWindow,
  parseTimestamp,
} from "./longitudinal-types.js";
export type {
  Observation,
  ObservationClass,
  NeedLifecycle,
  OutcomeKind,
  WindowPreset,
  LongitudinalPattern,
  LongitudinalNeed,
  EvolutionOutcome,
  SignalQuery,
  AdapterConnectionStatus,
  AnalysisScope,
  AnalysisScopeType,
  AnalyzeStatus,
  LifecycleHistoryEntry,
} from "./longitudinal-types.js";
export { PersistentSignalStore } from "./persistence/signal-store.js";
export { CrossRunAggregator } from "./aggregation/cross-run.js";
export { LongitudinalNeedDetector, lifecycleFromOutcome } from "./lifecycle/need-lifecycle.js";
export { OutcomeTracker } from "./outcome/outcome-tracker.js";
export {
  LongitudinalEvolveLoop,
  type LongitudinalOptions,
  type AnalyzeOpts,
} from "./longitudinal-controller.js";
export {
  ADAPTER_REGISTRY,
  adaptJsonlEventsFile,
  adaptJsonlEventsDir,
  observationToRaw,
} from "./adapters/jsonl-events.js";
export {
  dayObs,
  resetLongitudinalSeq,
  longitudinalFailureArc,
  sameExecutionTriple,
} from "./adapters/longitudinal-fixtures.js";
export { diagnoseWithInventory, type SystemInventory } from "./diagnosis/registry-aware.js";
export {
  snapshotInventoryFromRegistry,
  inventorySourceRevision,
  type InventorySnapshot,
  type InventorySnapshotStatus,
  type SnapshotInventoryOptions,
} from "./diagnosis/live-inventory.js";
export {
  attachEvolveLoopObserver,
  attachLiveEvolveLoop,
  eventToRawObservation,
  EVENT_COVERAGE,
  type EventCoverageMode,
} from "./adapters/runtime-observer.js";
export { AnalysisCadence, type AnalysisCadenceOptions } from "./cadence.js";
export {
  LIVE_CADENCE_DEFAULTS,
  resolveLiveCadence,
  scopeKey,
  type LiveCadenceConfig,
} from "./live/live-config.js";
export { ScopedAnalysisCadence } from "./live/scoped-cadence.js";
export {
  LiveAnalysisCoordinator,
  deriveScopeFromObservation,
  type LiveCoordinatorOptions,
  type NotifyMeta,
} from "./live/live-coordinator.js";
export {
  ObservationWindowManager,
  approveEvolutionRequestFixture,
  type ObservationWindow,
  type ObservationWindowStatus,
} from "./live/observation-window.js";
export {
  readGateResult,
  ingestGateResult,
  type GateDecision,
  type GateResult,
  type GateSourceKind,
  type IngestGateResultInput,
  type IngestGateResultOutput,
} from "./handoff/gate-result.js";
