/** Input extraction from ExecuteRequest / IR inputs. */

import type { ExecuteRequest, IRInput } from "../../types/index.js";

export function inputMap(inputs: IRInput[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const inp of inputs) {
    const ref = inp.ref;
    // ref forms: "path:src/foo.ts" | "query:auth" | "command:ls" | "key=value"
    const colon = ref.indexOf(":");
    if (colon > 0) {
      out[ref.slice(0, colon)] = ref.slice(colon + 1);
    } else {
      const eq = ref.indexOf("=");
      if (eq > 0) out[ref.slice(0, eq)] = ref.slice(eq + 1);
      else out.path = ref;
    }
  }
  return out;
}

export function requestInputs(request: ExecuteRequest): Record<string, string> {
  const fromInputs = inputMap(request.inputs ?? []);
  const constraints = (request.node.constraints ?? {}) as Record<string, unknown>;
  for (const [k, v] of Object.entries(constraints)) {
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      if (!(k in fromInputs)) fromInputs[k] = String(v);
    }
  }
  return fromInputs;
}
