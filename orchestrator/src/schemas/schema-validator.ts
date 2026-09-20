import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface JsonSchema {
  required?: string[];
  properties?: Record<string, JsonSchema & { const?: unknown; enum?: unknown[]; type?: string }>;
}

export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
}

export function loadJsonSchema(schemasDir: string, ref: string): JsonSchema | null {
  const path = join(schemasDir, `${ref}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8")) as JsonSchema;
}

/** Lightweight required-field + const validation — no external JSON Schema engine */
export function validateAgainstSchema(
  data: Record<string, unknown>,
  schema: JsonSchema,
  path = "",
): SchemaValidationResult {
  const errors: string[] = [];

  if (schema.required) {
    for (const key of schema.required) {
      if (!(key in data) || data[key] === undefined) {
        errors.push(`${path}${key} is required`);
      }
    }
  }

  if (schema.properties) {
    for (const [key, rule] of Object.entries(schema.properties)) {
      if (!(key in data)) continue;
      const val = data[key];
      if (rule.const !== undefined && val !== rule.const) {
        errors.push(`${path}${key} must be ${String(rule.const)}`);
      }
      if (rule.type && val !== null && val !== undefined) {
        const typeOk =
          (rule.type === "string" && typeof val === "string") ||
          (rule.type === "number" && typeof val === "number") ||
          (rule.type === "boolean" && typeof val === "boolean") ||
          (rule.type === "object" && typeof val === "object" && !Array.isArray(val)) ||
          (rule.type === "array" && Array.isArray(val));
        if (!typeOk) {
          errors.push(`${path}${key} must be type ${rule.type}`);
        }
      }
      if (rule.enum && !rule.enum.includes(val)) {
        errors.push(`${path}${key} not in enum`);
      }
      const nestedRule = rule as JsonSchema;
      if (
        typeof val === "object" &&
        val !== null &&
        !Array.isArray(val) &&
        (nestedRule.properties || nestedRule.required)
      ) {
        const nested = validateAgainstSchema(val as Record<string, unknown>, nestedRule, `${path}${key}.`);
        errors.push(...nested.errors);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
