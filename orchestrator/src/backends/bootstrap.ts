import { AgentBackendRegistry } from "./registry.js";
import { CursorAgentBackend } from "./cursor/adapter.js";
import { OllamaAgentBackend } from "./ollama/adapter.js";
import { CodexAgentBackend } from "./codex/adapter.js";
import { ClaudeCodeAgentBackend } from "./claude-code/adapter.js";
import { AntigravityAgentBackend } from "./antigravity/adapter.js";

/** Register real adapters (may be unhealthy without SDK/auth). No auto-fallback. */
export function registerBuiltinBackends(registry = new AgentBackendRegistry()): AgentBackendRegistry {
  registry.register(new CursorAgentBackend());
  registry.register(new OllamaAgentBackend());
  registry.register(new CodexAgentBackend());
  registry.register(new ClaudeCodeAgentBackend());
  registry.register(new AntigravityAgentBackend());
  return registry;
}
