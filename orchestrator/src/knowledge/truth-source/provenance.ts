import type { AiPageStatus, KnowledgeProvenance, TruthSourcedItem } from "./types.js";

const UNKNOWN_SOURCE = /^(unknown|n\/a|na|null|undefined)$/i;

export function isProvenanceComplete(provenance: KnowledgeProvenance | undefined): boolean {
  if (!provenance) return false;
  const ref = provenance.source_ref?.trim() ?? "";
  if (!ref || UNKNOWN_SOURCE.test(ref)) return false;
  if (provenance.edge_kind === "inferred" && !ref.includes(":")) {
    // inferred graph edges must cite file:line or similar locator
    return /\S+:\d+/.test(ref) || ref.startsWith("file:");
  }
  return true;
}

export function rejectMissingProvenance(item: TruthSourcedItem): TruthSourcedItem {
  return {
    ...item,
    rejection_reason: "missing_provenance",
  };
}

/** Pages without a citable source cannot remain `status: atual`. */
export function normalizeAiPageStatus(
  status: AiPageStatus | undefined,
  provenance: KnowledgeProvenance,
): { status: AiPageStatus; valid: boolean; reason?: string } {
  const hasSource = isProvenanceComplete(provenance);
  const normalized = status ?? "unknown";
  if (normalized === "atual" && !hasSource) {
    return { status: "draft", valid: false, reason: "atual_without_source" };
  }
  return { status: normalized, valid: true };
}
