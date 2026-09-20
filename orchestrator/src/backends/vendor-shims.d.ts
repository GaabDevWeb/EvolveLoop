declare module "@openai/codex-sdk" {
  export class Codex {
    startThread(): {
      id?: string;
      run(prompt: string): Promise<{ finalResponse?: string }>;
    };
  }
}

declare module "@anthropic-ai/claude-agent-sdk" {
  export function query(args: {
    prompt: string;
    options?: Record<string, unknown>;
  }): AsyncIterable<{ type: string; result?: string; session_id?: string }>;
}
