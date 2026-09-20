import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type {
  DetectedPattern,
  EvolutionCandidate,
  EvolutionRequest,
  NeedCandidate,
  NeedSignal,
  RootCauseAnalysis,
} from "./types.js";

export interface EvolveLoopStoreSnapshot {
  signals: NeedSignal[];
  patterns: DetectedPattern[];
  needs: NeedCandidate[];
  root_causes: RootCauseAnalysis[];
  candidates: EvolutionCandidate[];
  requests: EvolutionRequest[];
}

/**
 * Evolution-state persistence — separate from telemetry/evidence/knowledge/memory semantics.
 * Default: in-memory; optional filesystem mirror under evolutionDir.
 */
export class EvolveLoopStore {
  private signals: NeedSignal[] = [];
  private patterns: DetectedPattern[] = [];
  private needs: NeedCandidate[] = [];
  private rootCauses: RootCauseAnalysis[] = [];
  private candidates: EvolutionCandidate[] = [];
  private requests: EvolutionRequest[] = [];

  constructor(private readonly evolutionDir?: string) {
    if (evolutionDir) mkdirSync(evolutionDir, { recursive: true });
  }

  replace(snapshot: Partial<EvolveLoopStoreSnapshot>): void {
    if (snapshot.signals) this.signals = snapshot.signals;
    if (snapshot.patterns) this.patterns = snapshot.patterns;
    if (snapshot.needs) this.needs = snapshot.needs;
    if (snapshot.root_causes) this.rootCauses = snapshot.root_causes;
    if (snapshot.candidates) this.candidates = snapshot.candidates;
    if (snapshot.requests) this.requests = snapshot.requests;
  }

  snapshot(): EvolveLoopStoreSnapshot {
    return {
      signals: [...this.signals],
      patterns: [...this.patterns],
      needs: [...this.needs],
      root_causes: [...this.rootCauses],
      candidates: [...this.candidates],
      requests: [...this.requests],
    };
  }

  persist(): void {
    if (!this.evolutionDir) return;
    const snap = this.snapshot();
    writeFileSync(join(this.evolutionDir, "snapshot.json"), JSON.stringify(snap, null, 2));
  }

  load(): void {
    if (!this.evolutionDir) return;
    const path = join(this.evolutionDir, "snapshot.json");
    if (!existsSync(path)) return;
    const snap = JSON.parse(readFileSync(path, "utf-8")) as EvolveLoopStoreSnapshot;
    this.replace(snap);
  }

  listRequestFiles(): string[] {
    if (!this.evolutionDir || !existsSync(this.evolutionDir)) return [];
    return readdirSync(this.evolutionDir).filter((f) => f.startsWith("ereq-") && f.endsWith(".json"));
  }
}
