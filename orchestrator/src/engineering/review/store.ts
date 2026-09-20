/**
 * Review persistence — AT_LEAST_ONCE, version invalidation.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { ReviewCheckpoint, EngineeringReviewResult } from "./types.js";

export class ReviewStore {
  constructor(private readonly rootDir: string) {
    mkdirSync(rootDir, { recursive: true });
  }

  private path(reviewId: string): string {
    return join(this.rootDir, `${reviewId}.json`);
  }

  save(cp: ReviewCheckpoint): void {
    const p = this.path(cp.review_id);
    const tmp = p + ".tmp";
    writeFileSync(tmp, JSON.stringify(cp, null, 2), "utf-8");
    renameSync(tmp, p);
  }

  load(reviewId: string): ReviewCheckpoint | null {
    const p = this.path(reviewId);
    if (!existsSync(p)) return null;
    try {
      return JSON.parse(readFileSync(p, "utf-8")) as ReviewCheckpoint;
    } catch {
      return null;
    }
  }

  /** Invalidate reviews whose implementation_version no longer matches */
  invalidateStale(reviewId: string, currentImplVersion: string): ReviewCheckpoint | null {
    const cp = this.load(reviewId);
    if (!cp) return null;
    if (cp.implementation_version === currentImplVersion && cp.phase === "COMPLETED") {
      return cp;
    }
    if (cp.implementation_version !== currentImplVersion && cp.phase === "COMPLETED") {
      const next: ReviewCheckpoint = {
        ...cp,
        phase: "INVALIDATED",
        updated_at: new Date().toISOString(),
      };
      this.save(next);
      return next;
    }
    return cp;
  }

  recordFingerprint(reviewId: string, fingerprint: string, result?: EngineeringReviewResult): void {
    const cp = this.load(reviewId) ?? {
      kind: "ReviewCheckpoint" as const,
      apiVersion: "evolveloop.io/se/v1" as const,
      review_id: reviewId,
      phase: "PENDING" as const,
      implementation_version: result?.review_lineage.implementation_version ?? "",
      fingerprints: [],
      updated_at: new Date().toISOString(),
    };
    if (!cp.fingerprints.includes(fingerprint)) {
      cp.fingerprints.push(fingerprint);
    }
    if (result) {
      cp.result = result;
      cp.phase = "COMPLETED";
      cp.implementation_version = result.review_lineage.implementation_version;
    }
    cp.updated_at = new Date().toISOString();
    this.save(cp);
  }
}
