import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { loadJsonSchema, validateAgainstSchema } from "../../src/schemas/schema-validator.js";

describe("SchemaValidator", () => {
  const schemasDir = join(import.meta.dirname, "../../schemas/evidence");

  it("loads test-report schema", () => {
    const schema = loadJsonSchema(schemasDir, "test-report@1.0.0");
    expect(schema?.required).toContain("kind");
  });

  it("validates evidence structure", () => {
    const schema = loadJsonSchema(schemasDir, "test-report@1.0.0")!;
    const valid = validateAgainstSchema(
      {
        kind: "Evidence",
        metadata: { node_id: "t1", run_id: "r1", provider_id: "testing", capability: "testing" },
        spec: { status: "complete", verdict: "passed", checks: [] },
      },
      schema,
    );
    expect(valid.valid).toBe(true);

    const invalid = validateAgainstSchema({ kind: "Wrong" }, schema);
    expect(invalid.valid).toBe(false);
  });

  it("validates po-acceptance evidence schema", () => {
    const schema = loadJsonSchema(schemasDir, "po-acceptance@1.0.0")!;
    const valid = validateAgainstSchema(
      {
        kind: "Evidence",
        metadata: { node_id: "po1", run_id: "r1", provider_id: "po-review", capability: "po-acceptance" },
        spec: {
          status: "complete",
          verdict: "passed",
          checks: [],
          acceptance_summary: { executive: "APROVADO", orchestrator_status: "OK", blocking_count: 0, gate_phase_6: "LIBERADO" },
        },
      },
      schema,
    );
    expect(valid.valid).toBe(true);
  });

  it("validates security-review evidence schema", () => {
    const schema = loadJsonSchema(schemasDir, "security-review@1.0.0")!;
    const valid = validateAgainstSchema(
      {
        kind: "Evidence",
        metadata: { node_id: "s1", run_id: "r1", provider_id: "security", capability: "security-review" },
        spec: {
          status: "complete",
          verdict: "rejected",
          checks: [],
          security_summary: { executive: "BLOQUEADO - RISCO DETECTADO", critical_count: 1, high_count: 0, gate_phase_5: "BLOQUEADO" },
        },
      },
      schema,
    );
    expect(valid.valid).toBe(true);
  });
});
