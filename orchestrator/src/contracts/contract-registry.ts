import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import type { ContractCompatibilityResult, ContractDocument } from "./contract-types.js";
import { contractRefId, contractRefVersion, matchesPattern, parseSemVer, satisfies } from "./semver.js";

export class ContractRegistry {
  private contracts = new Map<string, ContractDocument>();

  constructor(docs: ContractDocument[] = []) {
    for (const doc of docs) this.register(doc);
  }

  register(doc: ContractDocument): void {
    const key = `${doc.metadata.id}@${doc.metadata.version}`;
    this.contracts.set(key, doc);
  }

  get(id: string, version: string): ContractDocument | undefined {
    return this.contracts.get(`${id}@${version}`);
  }

  getByRef(ref: string): ContractDocument | undefined {
    const id = contractRefId(ref);
    const version = contractRefVersion(ref);
    if (!version) return undefined;
    return this.get(id, version);
  }

  /** Node range vs provider contract ref — e.g. node ">=2.0.0 <3.0.0", provider contracts/frontend-ui@2.1.0 */
  isCompatible(nodeVersionRange: string | undefined, providerContractRef: string | undefined): ContractCompatibilityResult {
    if (!nodeVersionRange) return { compatible: true };
    if (!providerContractRef) {
      return { compatible: false, reason: "provider_missing_contract" };
    }

    const providerVersion = contractRefVersion(providerContractRef);
    if (!providerVersion) {
      return { compatible: false, reason: "invalid_contract_ref" };
    }

    if (providerVersion.includes("x")) {
      const v = parseSemVer(nodeVersionRange.replace(/^[^0-9]*/, "").split(/\s/)[0] ?? "");
      if (v && matchesPattern(v, providerVersion)) return { compatible: true };
    }

    if (satisfies(providerVersion, nodeVersionRange)) {
      return { compatible: true };
    }

    const doc = this.getByRef(providerContractRef);
    if (doc?.spec.compatible_with) {
      for (const pattern of doc.spec.compatible_with) {
        const patVersion = contractRefVersion(pattern) ?? pattern;
        if (patVersion.includes("x")) {
          const pv = parseSemVer(providerVersion);
          if (pv && matchesPattern(pv, patVersion)) {
            return { compatible: true, via_compatible_with: true };
          }
        } else if (satisfies(providerVersion, patVersion) || satisfies(patVersion.replace(/@.*/, ""), nodeVersionRange)) {
          return { compatible: true, via_compatible_with: true };
        }
      }
    }

    return {
      compatible: false,
      reason: `contract_version_mismatch: provider ${providerContractRef} not in ${nodeVersionRange}`,
    };
  }

  list(): ContractDocument[] {
    return [...this.contracts.values()];
  }
}

export function loadContractsFromDir(dir: string): ContractRegistry {
  const registry = new ContractRegistry();
  if (!existsSync(dir)) return registry;

  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".yaml") && !file.endsWith(".yml")) continue;
    const doc = parseYaml(readFileSync(join(dir, file), "utf-8")) as ContractDocument;
    if (doc?.kind === "Contract") registry.register(doc);
  }
  return registry;
}

export function parseContractRef(ref: string): { id: string; version: string } | null {
  const version = contractRefVersion(ref);
  if (!version) return null;
  return { id: contractRefId(ref), version };
}
