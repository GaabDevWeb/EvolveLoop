/**
 * Minimal HTTP JSON transport for ReasoningProvider adapters.
 * Isolated — not a shared runtime HTTP framework.
 */

export interface HttpJsonRequest {
  url: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: unknown;
  timeout_ms: number;
}

export interface HttpJsonResponse {
  status: number;
  ok: boolean;
  json: unknown;
  text: string;
  duration_ms: number;
}

export class HttpTransportError extends Error {
  readonly code: string;
  readonly status?: number;
  constructor(code: string, message: string, status?: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function httpJson(req: HttpJsonRequest): Promise<HttpJsonResponse> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), req.timeout_ms);

  const headers: Record<string, string> = {
    ...(req.headers ?? {}),
  };
  if (req.body !== undefined) {
    headers["content-type"] = headers["content-type"] ?? "application/json";
  }

  try {
    const res = await fetch(req.url, {
      method: req.method ?? (req.body !== undefined ? "POST" : "GET"),
      headers,
      body: req.body !== undefined ? JSON.stringify(req.body) : undefined,
      signal: controller.signal,
    });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return {
      status: res.status,
      ok: res.ok,
      json,
      text,
      duration_ms: Date.now() - started,
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new HttpTransportError("REASONING_TIMEOUT", `HTTP timeout after ${req.timeout_ms}ms`);
    }
    throw new HttpTransportError(
      "REASONING_PROVIDER_UNAVAILABLE",
      err instanceof Error ? err.message : String(err),
    );
  } finally {
    clearTimeout(timer);
  }
}
