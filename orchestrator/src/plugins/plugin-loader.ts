import { loadYamlFile } from "../registry/manifest-loader.js";
import type { ProviderManifest, ProviderRuntime } from "../types/index.js";
import type { AuthorityContext } from "../authority/capability-authority.js";
import { CursorSkillProvider, type SkillExecutor } from "./cursor-skill-provider.js";
import { MockProvider } from "../providers/mock-provider.js";
import { DeterministicProvider } from "../providers/deterministic/index.js";

export type PluginType = "cursor-skill" | "shell" | "mock" | "deterministic";

export interface PluginLoaderOptions {
  authorityContext?: AuthorityContext;
}

export class PluginLoader {
  constructor(
    private workspaceRoot: string,
    private options: PluginLoaderOptions = {},
  ) {}

  load(manifest: ProviderManifest, executor?: SkillExecutor): ProviderRuntime {
    const type = manifest.spec.plugin.type as PluginType;

    switch (type) {
      case "cursor-skill": {
        if (!executor) {
          throw new Error(
            `cursor-skill provider "${manifest.metadata.name}" requires SkillExecutor (use JobFileExecutor or CallbackSkillExecutor)`,
          );
        }
        return new CursorSkillProvider(manifest, executor, this.workspaceRoot);
      }
      case "mock":
        return new MockProvider(manifest.metadata.name);
      case "deterministic":
      case "shell":
        return DeterministicProvider.fromManifest(manifest, {
          workspaceRoot: this.workspaceRoot,
          authority: this.options.authorityContext,
          id: manifest.metadata.name,
        });
      default:
        throw new Error(`Unsupported plugin type: ${type}`);
    }
  }
}

export function loadProviderFromManifest(
  manifestPath: string,
  workspaceRoot: string,
  executor?: SkillExecutor,
  options?: PluginLoaderOptions,
): ProviderRuntime {
  const manifest = loadYamlFile<ProviderManifest>(manifestPath);
  return new PluginLoader(workspaceRoot, options).load(manifest, executor);
}
