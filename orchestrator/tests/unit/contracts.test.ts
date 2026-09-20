import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { ContractRegistry, loadContractsFromDir } from "../../src/contracts/contract-registry.js";

describe("ContractRegistry", () => {
  const contractsDir = join(import.meta.dirname, "../../contracts");

  it("loads contracts from directory", () => {
    const registry = loadContractsFromDir(contractsDir);
    expect(registry.get("testing", "1.0.0")).toBeDefined();
    expect(registry.get("frontend-ui", "2.0.0")).toBeDefined();
  });

  it("compatible when provider version satisfies node range", () => {
    const registry = loadContractsFromDir(contractsDir);
    const result = registry.isCompatible(">=2.0.0 <3.0.0", "contracts/frontend-ui@2.0.0");
    expect(result.compatible).toBe(true);
  });

  it("rejects incompatible versions", () => {
    const registry = loadContractsFromDir(contractsDir);
    const result = registry.isCompatible(">=3.0.0", "contracts/frontend-ui@2.0.0");
    expect(result.compatible).toBe(false);
    expect(result.reason).toContain("contract_version_mismatch");
  });

  it("allows missing node version constraint", () => {
    const registry = new ContractRegistry();
    expect(registry.isCompatible(undefined, "contracts/testing@1.0.0").compatible).toBe(true);
  });
});
