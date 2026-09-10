import { TOOL_API_ROUTES } from "../../../shared/_critical/appMount";

export interface ValidateResult {
  success: boolean;
  errorPath?: string | null;
  errorMessage?: string | null;
}

/** Asks the server to round-trip the draft through the host app's real serializer. */
export async function validateBody(schemaId: string, json: string, signal?: AbortSignal): Promise<ValidateResult> {
  const response = await fetch(TOOL_API_ROUTES.validateBody, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ schemaId, json }),
    signal,
  });
  if (!response.ok) throw new Error(`Validation unavailable (${response.status})`);
  return response.json();
}

export interface SendRequestOptions {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
}

export interface SendRequestResult {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  durationMs: number;
}

/** Sends the composed request straight from the browser to the host app's real endpoint. */
export async function sendRequest(options: SendRequestOptions): Promise<SendRequestResult> {
  const start = performance.now();
  const response = await fetch(options.url, {
    method: options.method,
    headers: options.headers,
    body: options.body,
    signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(60000)]) : AbortSignal.timeout(60000),
  });
  const body = await response.text();

  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => (headers[key] = value));

  return {
    status: response.status,
    statusText: response.statusText,
    headers,
    body,
    durationMs: Math.round(performance.now() - start),
  };
}
