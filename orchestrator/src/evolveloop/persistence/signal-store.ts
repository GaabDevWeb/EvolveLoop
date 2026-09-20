import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { NeedSignal } from "../types.js";
import type { EvolutionOutcome, LongitudinalNeed, SignalQuery } from "../longitudinal-types.js";
import { LONGITUDINAL_THRESHOLDS, hoursForWindow, parseTimestamp } from "../longitudinal-types.js";

/**
 * Persistent append-only signal store (JSONL) + needs/outcomes JSON.
 * Survives process restart. Semantic separation from telemetry/knowledge/memory.
 */
export class PersistentSignalStore {
  readonly signalsPath: string;
  readonly needsPath: string;
  readonly outcomesPath: string;
  readonly fingerprintsPath: string;

  private fingerprints = new Set<string>();

  constructor(private readonly evolutionDir: string) {
    mkdirSync(evolutionDir, { recursive: true });
    this.signalsPath = join(evolutionDir, "signals.jsonl");
    this.needsPath = join(evolutionDir, "needs.json");
    this.outcomesPath = join(evolutionDir, "outcomes.jsonl");
    this.fingerprintsPath = join(evolutionDir, "fingerprints.json");
    this.loadFingerprints();
  }

  private loadFingerprints(): void {
    if (!existsSync(this.fingerprintsPath)) return;
    try {
      const raw = JSON.parse(readFileSync(this.fingerprintsPath, "utf-8")) as string[];
      this.fingerprints = new Set(raw);
    } catch {
      this.fingerprints = new Set();
    }
  }

  private saveFingerprints(): void {
    writeFileSync(this.fingerprintsPath, JSON.stringify([...this.fingerprints]), "utf-8");
  }

  /** Append signals idempotently by fingerprint. Returns newly written count. */
  appendSignals(signals: NeedSignal[], now: Date = new Date()): { written: number; skipped: number; rejected: number } {
    let written = 0;
    let skipped = 0;
    let rejected = 0;
    for (const s of signals) {
      const ts = parseTimestamp(s.timestamp, now);
      if (!ts.ok) {
        rejected += 1;
        continue;
      }
      if (this.fingerprints.has(s.fingerprint)) {
        skipped += 1;
        continue;
      }
      appendFileSync(this.signalsPath, `${JSON.stringify(s)}\n`, "utf-8");
      this.fingerprints.add(s.fingerprint);
      written += 1;
    }
    this.saveFingerprints();
    this.trimIfNeeded();
    return { written, skipped, rejected };
  }

  loadAllSignals(): NeedSignal[] {
    if (!existsSync(this.signalsPath)) return [];
    const lines = readFileSync(this.signalsPath, "utf-8").split("\n").filter(Boolean);
    const out: NeedSignal[] = [];
    for (const line of lines) {
      try {
        out.push(JSON.parse(line) as NeedSignal);
      } catch {
        /* skip corrupt line */
      }
    }
    return out;
  }

  query(q: SignalQuery): NeedSignal[] {
    const now = q.now ?? new Date();
    const hours = q.window ? hoursForWindow(q.window, q.custom_hours) : undefined;
    const sinceMs = q.since
      ? Date.parse(q.since)
      : hours
        ? now.getTime() - hours * 3600_000
        : undefined;
    const untilMs = q.until ? Date.parse(q.until) : now.getTime() + 5 * 60_000;

    let signals = this.loadAllSignals();
    signals = signals.filter((s) => {
      const t = Date.parse(s.timestamp);
      if (Number.isNaN(t)) return false;
      if (sinceMs !== undefined && t < sinceMs) return false;
      if (t > untilMs) return false;
      if (q.user_id && s.user_id !== q.user_id) return false;
      if (q.project_id && s.project_id !== q.project_id) return false;
      if (q.feature_id) {
        const metaWs = s.metadata?.workspace_id ?? s.metadata?.feature_id;
        const match =
          s.feature_id === q.feature_id ||
          s.scope.id === q.feature_id ||
          metaWs === q.feature_id;
        if (!match) return false;
      }
      if (q.domain && s.domain !== q.domain) return false;
      if (q.task_class && s.task_class !== q.task_class) return false;
      if (q.type && s.type !== q.type) return false;
      if (q.source && s.source !== q.source) return false;
      if (q.fingerprint && s.fingerprint !== q.fingerprint) return false;
      return true;
    });
    if (q.limit) signals = signals.slice(-q.limit);
    return signals;
  }

  hasFingerprint(fp: string): boolean {
    return this.fingerprints.has(fp);
  }

  /** Durable fingerprint count — used by AnalysisCadence for new-signal gating. */
  getFingerprintCount(): number {
    return this.fingerprints.size;
  }

  saveNeeds(needs: LongitudinalNeed[]): void {
    writeFileSync(this.needsPath, JSON.stringify(needs, null, 2), "utf-8");
  }

  loadNeeds(): LongitudinalNeed[] {
    if (!existsSync(this.needsPath)) return [];
    try {
      return JSON.parse(readFileSync(this.needsPath, "utf-8")) as LongitudinalNeed[];
    } catch {
      return [];
    }
  }

  appendOutcome(outcome: EvolutionOutcome): void {
    appendFileSync(this.outcomesPath, `${JSON.stringify(outcome)}\n`, "utf-8");
  }

  loadOutcomes(): EvolutionOutcome[] {
    if (!existsSync(this.outcomesPath)) return [];
    return readFileSync(this.outcomesPath, "utf-8")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l) as EvolutionOutcome);
  }

  private trimIfNeeded(): void {
    const all = this.loadAllSignals();
    if (all.length <= LONGITUDINAL_THRESHOLDS.max_signals_retained) return;
    const kept = all.slice(-LONGITUDINAL_THRESHOLDS.max_signals_retained);
    const tmp = `${this.signalsPath}.tmp`;
    writeFileSync(tmp, kept.map((s) => JSON.stringify(s)).join("\n") + "\n", "utf-8");
    renameSync(tmp, this.signalsPath);
    this.fingerprints = new Set(kept.map((s) => s.fingerprint));
    this.saveFingerprints();
  }
}
