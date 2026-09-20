#!/usr/bin/env node
/**
 * Registry Builder CLI — agrega provider manifests + telemetria → capability-registry.yaml
 *
 * Usage:
 *   registry-builder build --manifests providers/ --output registry/capability-registry.yaml
 *   registry-builder build --manifests providers/ --telemetry telemetry/events/ --output out.yaml
 */
import { readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { stringify as stringifyYaml } from "yaml";
import { loadYamlFile } from "../registry/manifest-loader.js";
import { buildRegistry } from "../registry/registry-builder.js";
import type { ProviderManifest } from "../types/index.js";

function parseArgs(argv: string[]) {
  const args: Record<string, string> = { command: argv[2] ?? "build" };
  for (let i = 3; i < argv.length; i++) {
    const key = argv[i];
    if (key.startsWith("--")) {
      const val = argv[i + 1];
      if (val && !val.startsWith("--")) {
        args[key.slice(2)] = val;
        i++;
      } else {
        args[key.slice(2)] = "true";
      }
    }
  }
  return args;
}

function loadManifestsFromDir(dir: string): ProviderManifest[] {
  const manifests: ProviderManifest[] = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    if (!name.isDirectory()) continue;
    const path = join(dir, name.name, "provider.yaml");
    try {
      manifests.push(loadYamlFile<ProviderManifest>(path));
    } catch {
      // skip
    }
  }
  return manifests;
}

function main() {
  const args = parseArgs(process.argv);

  if (args.command !== "build") {
    console.error("Usage: registry-builder build --manifests <dir> [--telemetry <dir>] --output <file.yaml>");
    process.exit(1);
  }

  if (!args.manifests || !args.output) {
    console.error("Required: --manifests and --output");
    process.exit(1);
  }

  const manifestsDir = resolve(args.manifests);
  const manifests = loadManifestsFromDir(manifestsDir);
  if (manifests.length === 0) {
    console.error(`No provider.yaml found in ${manifestsDir}`);
    process.exit(1);
  }

  const registry = buildRegistry({
    manifests,
    telemetryEventsDir: args.telemetry ? resolve(args.telemetry) : undefined,
    generator: "registry-builder/1.0.0",
  });

  const outPath = resolve(args.output);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, stringifyYaml(registry), "utf-8");

  const capCount = Object.keys(registry.capabilities).length;
  const providerCount = Object.values(registry.capabilities).reduce((n, c) => n + c.providers.length, 0);
  console.log(JSON.stringify({ output: outPath, capabilities: capCount, providers: providerCount }, null, 2));
}

main();
