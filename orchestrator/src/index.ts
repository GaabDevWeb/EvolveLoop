export * from "./types/index.js";
export { validateIR, loadIRFromObject, newRunId } from "./ir/validator.js";
export { GraphStore } from "./graph/graph-store.js";
export { EventBus, eventsToJsonl } from "./events/event-bus.js";
export { validateEvidence, buildSuccessEvidence, buildRejectedGateEvidence } from "./evidence/validator.js";
export {
  buildPlanningEvidence,
  buildSchedulingEvidence,
  buildSelectionEvidence,
  buildWorkerEvidence,
  buildGateEvidence,
  buildExecutionEvidence,
  validateEvidenceV21,
} from "./evidence/builders.js";
export { deriveRunState, canTransition, transitionNode } from "./state/run-state.js";
export { SmartMockExecutor, createSmartMockProvider } from "./executors/smart-mock-executor.js";
export { PatternAggregator } from "./learning/pattern-aggregator.js";
export {
  EvolveLoopController,
  SignalMiner,
  PatternDetector,
  NeedDetector,
  RootCauseAnalyzer,
  EvolutionCandidateGenerator,
  CandidateValidator,
  EvolveLoopStore,
  SyntheticFixtures,
  EVOLVE_THRESHOLDS,
  PIPELINE_HANDOFF_CONTRACT,
  submitEvolutionRequest,
  buildEvolutionRequest,
  LongitudinalEvolveLoop,
  PersistentSignalStore,
  CrossRunAggregator,
  LongitudinalNeedDetector,
  OutcomeTracker,
  ADAPTER_REGISTRY,
  LONGITUDINAL_THRESHOLDS,
  longitudinalFailureArc,
  sameExecutionTriple,
  diagnoseWithInventory,
  snapshotInventoryFromRegistry,
  attachEvolveLoopObserver,
  attachLiveEvolveLoop,
  AnalysisCadence,
  LiveAnalysisCoordinator,
  ObservationWindowManager,
  approveEvolutionRequestFixture,
  LIVE_CADENCE_DEFAULTS,
  ScopedAnalysisCadence,
  deriveScopeFromObservation,
  EVENT_COVERAGE,
  readGateResult,
  ingestGateResult,
} from "./evolveloop/index.js";
export type {
  RawObservation,
  NeedSignal,
  DetectedPattern,
  NeedCandidate,
  RootCauseAnalysis,
  EvolutionCandidate,
  EvolutionRequest,
  EvolveLoopRunResult,
  AutonomyLevel,
  CandidateType,
  EvolutionScopeClass,
  LongitudinalNeed,
  EvolutionOutcome,
  ObservationClass,
  NeedLifecycle,
  OutcomeKind,
  AnalysisScope,
  InventorySnapshot,
  SystemInventory,
  LiveCoordinatorOptions,
  LiveCadenceConfig,
  ObservationWindow,
  GateDecision,
  GateResult,
  GateSourceKind,
  EventCoverageMode,
} from "./evolveloop/index.js";

export { PolicyEngine } from "./policies/policy-engine.js";
export { RegistryClient, buildRegistryFromManifests } from "./registry/registry-client.js";
export {
  loadYamlFile,
  manifestToRegistryEntries,
  buildRegistryFromManifestFiles,
  loadPolicy,
  loadPoliciesFromDir,
} from "./registry/manifest-loader.js";
export { KnowledgeStore } from "./knowledge/knowledge-store.js";
export { FilesystemKnowledgeStore } from "./knowledge/filesystem-knowledge-store.js";
export type {
  KnowledgeBackend,
  KnowledgeBackendId,
  KnowledgeHealth,
  KnowledgeInspectResult,
} from "./knowledge/backend/types.js";
export { resolveKnowledgeBackend, resetKnowledgeBackendCache } from "./knowledge/backend/resolve.js";
export { WikiKnowledgeBackend, resolveWikiRoot, resolveWikiCliModule } from "./knowledge/backend/wiki-backend.js";
export { FakeKnowledgeBackend } from "./knowledge/backend/fake-backend.js";
export {
  loadMegaBrainProfile,
  loadEvolveLoopProfile,
  resolveKnowledgeBackendId,
  DEFAULT_PROFILE,
  type MegaBrainProfile,
  type EvolveLoopProfile,
} from "./config/profile.js";
export { MemoryStore } from "./memory/memory-store.js";
export { FilesystemMemoryStore } from "./memory/filesystem-memory-store.js";
export { JsonlEventPersister } from "./persistence/jsonl-event-persister.js";
export { resolveDataPaths, type DataPaths } from "./persistence/paths.js";
export { MetricsAccumulator } from "./telemetry/metrics-accumulator.js";
export {
  summarizeExecutionTrace,
  type ExecutionTraceInput,
  type ExecutionTraceSummary,
  type CapabilityCallSummary,
  type AuthorityDecisionSummary,
  type ExecutionErrorSummary,
} from "./telemetry/execution-trace.js";
export {
  buildSkillTelemetryRecord,
  emitSkillTelemetry,
  appendSkillTelemetryJsonl,
  recordSkillLifecycle,
  aggregateSkillTelemetry,
  loadSkillTelemetryFromDir,
  type SkillTelemetryRecord,
  type SkillTelemetryEventType,
  type SkillUsageAggregate,
  type ObservationWindow,
} from "./telemetry/skill-telemetry.js";
export {
  evaluateGrillMeRequired,
  evaluateGrillMeTransition,
  evaluateImageToCodeGate,
  skillGatesToRequireFlags,
  type GrillMeGateInput,
  type ImageToCodeGateInput,
  type SkillGateDecision,
  type GateStatus,
  type RiskTier,
} from "./policy/skill-gates.js";
export { Orchestrator } from "./orchestrator/orchestrator.js";
export { Scheduler } from "./scheduler/scheduler.js";
export { MockProvider, ProviderRouter, createMockProvider } from "./providers/mock-provider.js";
export {
  CursorSkillProvider,
  JobFileExecutor,
  CallbackSkillExecutor,
  evidenceFromShellResult,
  type SkillExecutor,
} from "./plugins/cursor-skill-provider.js";
export { PluginLoader, loadProviderFromManifest } from "./plugins/plugin-loader.js";
export { ExecutionEngine } from "./engine/execution-engine.js";
export { ContractRegistry, loadContractsFromDir, parseContractRef } from "./contracts/contract-registry.js";
export { parseSemVer, satisfies, matchesPattern, contractRefVersion, contractRefId } from "./contracts/semver.js";
export type { ContractDocument, ContractCompatibilityResult } from "./contracts/contract-types.js";
export { buildRegistry, aggregateProviderStats } from "./registry/registry-builder.js";
export { loadJsonSchema, validateAgainstSchema } from "./schemas/schema-validator.js";
export { discoverAllManifests, discoverManifestForCapability } from "./discovery/provider-discovery.js";
export {
  authorize,
  CapabilityAuthority,
  createCapabilityAuthority,
  pathEscapesWorkspace,
  type AuthorityContext,
  type AuthorityRequest,
  type AuthorityResult,
  type AuthorityDecision,
} from "./authority/capability-authority.js";
export {
  filterRegistryByProfile,
  capabilitiesForProfile,
  CAPABILITY_PROFILES,
  type CapabilityProfile,
} from "./discovery/capability-profiles.js";
export {
  DeterministicProvider,
  createDeterministicProvider,
  DEFAULT_HANDLERS,
} from "./providers/deterministic/index.js";
export {
  buildAuthorityEvidence,
  buildRetrievalEvidence,
} from "./evidence/builders.js";
export * from "./capabilities/results.js";
export { JobStore, type SkillJob, type SkillJobResult } from "./jobs/job-store.js";
export { invokePickup, buildPickupPrompt, type PickupPlan } from "./jobs/job-pickup.js";
export { jobResultToExecuteResult, loadEvidenceFile } from "./jobs/job-resume.js";
export { saveCheckpoint, loadCheckpoint, clearCheckpoint, type EngineCheckpoint } from "./jobs/checkpoint.js";
