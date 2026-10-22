import { describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  measurePromptCachePrefixStability,
  VENDOR_HTTP_CACHE_LABEL,
} from "../../src/v22/measure-prompt-cache-prefix.js";

describe("GOAL-010 prefix stability measure", () => {
  it("reports cacheable % and honest vendor label (no tautological hit rate)", () => {
    const jobsDir = mkdtempSync(join(tmpdir(), "measure-cache-"));
    const report = measurePromptCachePrefixStability({
      jobsDir,
      orchestratorRoot: join(import.meta.dirname, "../.."),
    });
    expect(report.vendor_http_cache_hit).toBe(VENDOR_HTTP_CACHE_LABEL);
    expect(report.rows).toHaveLength(12);
    expect(report.median_cacheable_pct).toBeGreaterThan(0);
    expect(report.median_cacheable_pct).toBeLessThan(100);
    expect(report.same_feature_two_jobs.prefix_key_equal).toBe(true);
    expect(report.same_feature_two_jobs.normalized_prefix_key_equal).toBe(true);
    expect(report.cross_task_prefix_key_unique_count).toBeGreaterThan(1);
  });
});
