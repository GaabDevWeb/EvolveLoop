import { describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { measureV22Goals009010 } from "../../src/v22/p2-bench-measure.js";

describe("V22 goals 009/010 aggregate measure", () => {
  it("returns pickup + prefix reports", () => {
    const jobsDir = mkdtempSync(join(tmpdir(), "v22-measure-"));
    const report = measureV22Goals009010({
      jobsDir,
      orchestratorRoot: join(import.meta.dirname, "../.."),
    });
    expect(report.goal_009_pickup.pairs).toHaveLength(12);
    expect(report.goal_010_prefix.rows).toHaveLength(12);
    expect(report.goal_010_prefix.vendor_http_cache_hit).toBe("NOT_MEASURED");
  });
});
