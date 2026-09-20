import { describe, it, expect } from "vitest";
import { validateIR } from "../../src/ir/validator.js";
import { buildMinimalIR, loginDashboardIR } from "../fixtures/login-dashboard.js";

describe("IR Validator", () => {
  it("validates correct IR", () => {
    const errors = validateIR(loginDashboardIR);
    expect(errors.filter((e) => e.code === "IR_CYCLE_DETECTED")).toHaveLength(0);
    expect(errors.filter((e) => e.code === "IR_DUPLICATE_ID")).toHaveLength(0);
  });

  it("detects duplicate ids", () => {
    const ir = buildMinimalIR();
    ir.spec.nodes.push({ ...ir.spec.nodes[0] });
    const errors = validateIR(ir);
    expect(errors.some((e) => e.code === "IR_DUPLICATE_ID")).toBe(true);
  });

  it("detects dangling dependencies", () => {
    const ir = buildMinimalIR();
    ir.spec.nodes[1].dependencies = ["missing"];
    const errors = validateIR(ir);
    expect(errors.some((e) => e.code === "IR_DANGLING_EDGE")).toBe(true);
  });

  it("detects cycles", () => {
    const ir = buildMinimalIR();
    ir.spec.nodes[0].dependencies = ["b"];
    const errors = validateIR(ir);
    expect(errors.some((e) => e.code === "IR_CYCLE_DETECTED")).toBe(true);
  });
});
