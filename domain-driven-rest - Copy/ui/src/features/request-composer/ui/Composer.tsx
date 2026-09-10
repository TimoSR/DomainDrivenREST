import { useUiStore } from "../../../shared/state/uiStore";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  sendRequest,
  validateBody,
  type SendRequestResult,
  type ValidateResult,
} from "../infrastructure/requestClient";
import { resolveSchema, type ApiDocument, type EndpointDescriptor } from "../../api-schema";
import { useRequestDraftStore } from "../application/requestDraftStore";
import { useHistoryStore } from "../application/historyStore";
import { defaultValueForRef } from "../domain/defaultValue";
import { sampleForRef } from "../domain/sampleData";
import { friendlyTypeName } from "../../api-schema";
import { methodColor } from "../../../shared/domain/methods";
import { CODE_TARGETS, generateCode, type CodeTarget } from "../domain/codegen";
import { FormRenderer } from "./FormRenderer";
const JsonEditor = lazy(() => import("./JsonEditor").then(module => ({ default: module.JsonEditor })));
import { ResponseStats, ResponseViewer } from "./ResponseViewer";
import { Braces, Check, Copy, Sparkle, Warning } from "../../../shared/ui/Icons";
import { TIMING } from "../../../shared/_critical/uiDefaults";

// Drafts stay in memory for this tab; credentials are never stored here.
const draftsByEndpoint = new Map<string, { json: string; params: Record<string, string> }>();

export function Composer({ doc }: { doc: ApiDocument }) {
  const { operationId } = useParams<{ operationId: string }>();
  const endpoint = useMemo(
    () => doc.endpoints.find((e) => e.operationId === operationId),
    [doc, operationId],
  );

  if (!endpoint) {
    return (
      <div className="placeholder">
        <h2>Endpoint not found</h2>
        <p>It may have been removed since the schema was last synced.</p>
      </div>
    );
  }

  return <ComposerBody key={endpoint.operationId} doc={doc} endpoint={endpoint} />;
}

function ComposerBody({ doc, endpoint }: { doc: ApiDocument; endpoint: EndpointDescriptor }) {
  const draft = useRequestDraftStore();
  const addHistory = useHistoryStore((s) => s.add);

  const [paramValues, setParamValues] = useState<Record<string, string>>(() => draftsByEndpoint.get(endpoint.operationId)?.params ?? {});
  const paramsRef = useRef(paramValues);
  paramsRef.current = paramValues;
  const [authHeader, setAuthHeader] = useState("");
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => requestRef.current?.abort(), []);
  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState<SendRequestResult | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [serverCheck, setServerCheck] = useState<ValidateResult | null>(null);
  const [codeTarget, setCodeTarget] = useState<CodeTarget | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const bodySchema = endpoint.requestBody ? resolveSchema(endpoint.requestBody, doc.schemas) : undefined;
  const bodyTypeName = bodySchema ? friendlyTypeName(bodySchema.clrTypeName) : null;
  const color = methodColor(endpoint.httpMethod);

  // GET and DELETE declare no request body, so the JSON pane had nothing to show but a note
  // saying so. It isn't rendered at all now and the response takes the whole column. Keyed
  // on the schema rather than the method: a GET that does declare a body still gets its
  // editor, and a bodyless POST doesn't get an empty one.
  const hasRequestBody = Boolean(endpoint.requestBody);

  const pathParams = endpoint.parameters.filter((p) => p.location === "Path");
  const queryParams = endpoint.parameters.filter((p) => p.location === "Query");
  const headerParams = endpoint.parameters.filter((p) => p.location === "Header");
  const hasParams = endpoint.parameters.length > 0;

  // Keyed on the operation alone: re-running this on any new `doc` identity would throw
  // away a request body the user is part-way through editing.
  useEffect(() => {
    draft.init(
      bodySchema,
      doc.schemas,
      endpoint.requestBody ? defaultValueForRef(endpoint.requestBody, doc.schemas) : undefined,
    );
    const saved = draftsByEndpoint.get(endpoint.operationId);
    if (saved && endpoint.requestBody) draft.setJsonText(saved.json);
    return () => {
      draftsByEndpoint.set(endpoint.operationId, { json: useRequestDraftStore.getState().jsonText, params: paramsRef.current });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint.operationId]);

  const buildPath = useCallback(() => {
    let path = endpoint.relativePath;
    for (const p of pathParams) {
      path = path.replace(`{${p.name}}`, encodeURIComponent(paramValues[p.name] ?? ""));
    }
    const query = queryParams
      .filter((p) => paramValues[p.name])
      .map((p) => `${encodeURIComponent(p.name)}=${encodeURIComponent(paramValues[p.name])}`)
      .join("&");
    return `/${path}${query ? `?${query}` : ""}`;
  }, [endpoint.relativePath, pathParams, queryParams, paramValues]);

  const buildHeaders = useCallback(() => {
    const headers: Record<string, string> = {};
    if (endpoint.requestBody) headers["Content-Type"] = "application/json";
    if (authHeader) headers["Authorization"] = authHeader;
    for (const p of headerParams) {
      if (paramValues[p.name]) headers[p.name] = paramValues[p.name];
    }
    return headers;
  }, [endpoint.requestBody, authHeader, headerParams, paramValues]);

  const handleSend = useCallback(async () => {
    if (draft.jsonSyntaxError || requestRef.current) return;
    const missing = endpoint.parameters.filter(p => p.required && !paramValues[p.name]?.trim());
    if (missing.length) { setSendError(`Complete required parameters: ${missing.map(p => p.name).join(", ")}.`); return; }
    const controller = new AbortController();
    requestRef.current = controller;
    setSending(true);
    setSendError(null);
    setResponse(null);
    try {
      const result = await sendRequest({
        signal: controller.signal,
        method: endpoint.httpMethod,
        url: buildPath(),
        headers: buildHeaders(),
        body: endpoint.requestBody ? draft.jsonText : undefined,
      });
      setResponse(result);
      addHistory({
        operationId: endpoint.operationId,
        method: endpoint.httpMethod,
        path: buildPath(),
        status: result.status,
        durationMs: result.durationMs,
        body: endpoint.requestBody ? draft.jsonText : undefined,
      });
    } catch (err) {
      setSendError(controller.signal.aborted ? "Request cancelled. The server may already have processed it." : (err as Error).name === "TimeoutError" ? "The request timed out after 60 seconds." : (err as Error).message);
    } finally {
      requestRef.current = null;
      setSending(false);
    }
  }, [draft.jsonSyntaxError, draft.jsonText, endpoint, buildPath, buildHeaders, addHistory, paramValues]);

  // ⌘⏎ / Ctrl+⏎ sends from anywhere in the composer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !useUiStore.getState().paletteOpen) {
        e.preventDefault();
        void handleSend();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSend]);

  // Confirm the draft against the real C# type, debounced, whenever it settles.
  useEffect(() => {
    if (!endpoint.requestBody?.ref || draft.jsonSyntaxError) {
      setServerCheck(null);
      return;
    }
    setServerCheck(null);
    const controller = new AbortController();
    const schemaId = endpoint.requestBody.ref;
    const json = draft.jsonText;
    const timer = setTimeout(() => {
      validateBody(schemaId, json, controller.signal)
        .then(result => { if (!controller.signal.aborted) setServerCheck(result); })
        .catch(() => { if (!controller.signal.aborted) setServerCheck(null); });
    }, TIMING.validateDebounce);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [draft.jsonText, draft.jsonSyntaxError, endpoint.requestBody]);

  const copyCode = async (target: CodeTarget) => {
    const code = generateCode(target, {
      method: endpoint.httpMethod,
      path: buildPath(),
      origin: window.location.origin,
      headers: buildHeaders(),
      body: endpoint.requestBody ? draft.jsonText : undefined,
    });

    setCodeTarget(target);
    setCopyState((await writeToClipboard(code)) ? "copied" : "failed");
    setTimeout(() => setCopyState("idle"), TIMING.copyFeedback);
  };

  const blocked = Boolean(draft.jsonSyntaxError);

  // Rendered into whichever pane heads the column, so Send keeps one position on screen.
  const sendButton = (
    <> {sending && <button className="chip-btn" onClick={() => requestRef.current?.abort()}>Cancel</button>}<button
      className="btn-send"
      disabled={sending || blocked}
      onClick={handleSend}
      title={blocked ? "Fix the JSON syntax error before sending." : undefined}
    >
      {sending ? "Sending…" : "Send request"}
      <span className="kbd">Ctrl ↵</span>
    </button></>
  );

  return (
    <div className="composer">
      {/* ── Form column ─────────────────────────────── */}
      <section className="col col-form">
        <div className="col-head">
          <div className="endpoint-title">
            <span className="method-lg" style={{ ["--m-color" as string]: color }}>
              {endpoint.httpMethod}
            </span>
            <span className="path">/{endpoint.relativePath}</span>
          </div>
          {bodyTypeName && (
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: "var(--fs-body)", color: "var(--t3)" }}>Body type</span>
              <span className="type-chip">
                <Braces color="var(--accent-2)" />
                {bodyTypeName}
              </span>
            </div>
          )}
        </div>

        {/* Everything the request needs, in one scroll. Splitting params from the body
            behind tabs meant a required route id could sit unfilled on a tab you never
            opened, so the first thing you learned about it was a 404. */}
        <div className="col-scroll">
          <div className="form-pane">
            {!hasParams && !bodySchema && (
              <p className="empty-note">
                Nothing to fill in — {endpoint.httpMethod} {`/${endpoint.relativePath}`} takes no parameters and
                sends no body. Just send it.
              </p>
            )}

            {/* Parameters come first: they complete the URL, and there are rarely more
                than one or two, so the body still starts near the top. */}
            {hasParams && (
              <section className="form-section">
                <h3 className="eyebrow">
                  Parameters <span className="count">{endpoint.parameters.length}</span>
                </h3>
                {endpoint.parameters.map((p) => (
                  <div className="field" key={`${p.location}-${p.name}`}>
                    <label className="field-label">
                      <span>{p.name}</span>
                      {p.required && <span className="req">REQ</span>}
                      <span className="clr-type">{p.location.toLowerCase()}</span>
                    </label>
                    <input
                      className="input"
                      aria-label={`${p.name} (${p.location.toLowerCase()})`}
                      aria-required={p.required}
                      value={paramValues[p.name] ?? ""}
                      onChange={(e) => setParamValues((prev) => ({ ...prev, [p.name]: e.target.value }))}
                    />
                  </div>
                ))}
              </section>
            )}

            {bodySchema && (
              <section className="form-section">
                <h3 className="eyebrow">
                  Body
                  <span className="spacer" />
                  <button
                    className="chip-btn"
                    onClick={() => draft.replaceValue(sampleForRef(endpoint.requestBody, doc.schemas))}
                    title="Fill every field with plausible values that satisfy the schema's rules"
                  >
                    <Sparkle size={12} color="var(--accent)" />
                    Fill with sample data
                  </button>
                </h3>
                <FormRenderer
                  schema={bodySchema}
                  value={draft.value}
                  path={[]}
                  table={doc.schemas}
                  errors={draft.validationErrors}
                  onChange={draft.setFieldValue}
                />
              </section>
            )}

            {/* Set once and forgotten, unlike the fields above — so it sits last. */}
            <section className="form-section">
              <h3 className="eyebrow">Auth</h3>
              <div className="field">
                <label className="field-label">
                  <span>Authorization</span>
                  <span className="clr-type">header</span>
                </label>
                <input
                  className="input"
                  type="password"
                  aria-label="Authorization header"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Bearer …"
                  value={authHeader}
                  onChange={(e) => setAuthHeader(e.target.value)}
                />
              </div>
            </section>
          </div>
        </div>
      </section>

      {/* ── JSON + response column ──────────────────────
           The request body and the response it produced share one column, stacked:
           you send from the top half and read the result directly underneath. */}
      <section className="col col-work">
        {hasRequestBody && (
          <div className="pane-request">
            <div className="pane-head">
              <span>JSON</span>
              <span className="sync-chip">
                <span className="dot" />
                Live-synced
              </span>
              <span className="spacer" />
              {sendButton}
            </div>

            <div className="json-editor">
              <Suspense fallback={<div className="placeholder" role="status">Loading JSON editor…</div>}><JsonEditor value={draft.jsonText} onChange={draft.setJsonText} /></Suspense>
            </div>
            <ValidityStrip
              syntaxError={draft.jsonSyntaxError}
              clientErrors={draft.validationErrors.length}
              serverCheck={serverCheck}
              typeName={bodyTypeName}
            />
          </div>
        )}

        <div className="pane-response">
          <div className="pane-head">
            <span>Response</span>
            {response && <ResponseStats result={response} />}
            {/* With no body to edit this is the column's first row, so Send belongs
                here — it stays top-right of the column either way. */}
            {!hasRequestBody && (
              <>
                <span className="spacer" />
                {sendButton}
              </>
            )}
          </div>

          {sendError && (
            <div className="validity bad">
              <div className="validity-line">
                <Warning color="var(--danger)" />
                Request failed
              </div>
              <span className="validity-sub">{sendError}</span>
            </div>
          )}

          {response ? (
            <ResponseViewer result={response} />
          ) : (
            !sendError && (
              <div className="placeholder">
                <h2>{sending ? "Waiting for your API…" : "Ready when you are"}</h2>
                <p>
                  Complete the request, then select Send request. Your response, status, and timing will appear here.
                </p>
              </div>
            )
          )}

          <div className="export-bar">
            <span className="label" style={copyState === "failed" ? { color: "var(--danger)" } : undefined}>
              {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy blocked — select and copy manually" : "Copy as"}
            </span>
            {CODE_TARGETS.map((target) => (
              <button
                key={target}
                className={`chip-btn${copyState === "copied" && codeTarget === target ? " active" : ""}`}
                onClick={() => copyCode(target)}
              >
                {copyState === "copied" && codeTarget === target ? <Copy size={11} /> : null} {target}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * The async Clipboard API needs a focused, secure context; when it refuses, fall back to a
 * hidden textarea + execCommand so the copy still lands in older or stricter contexts.
 */
async function writeToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fall through to the legacy path.
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

function ValidityStrip({
  syntaxError,
  clientErrors,
  serverCheck,
  typeName,
}: {
  syntaxError?: string;
  clientErrors: number;
  serverCheck: ValidateResult | null;
  typeName: string | null;
}) {
  if (syntaxError) {
    return (
      <div className="validity bad">
        <div className="validity-line">
          <Warning color="var(--danger)" />
          JSON syntax error
        </div>
        <span className="validity-sub">{syntaxError} — sending is disabled until this parses.</span>
      </div>
    );
  }

  if (serverCheck && !serverCheck.success) {
    return (
      <div className="validity bad">
        <div className="validity-line">
          <Warning color="var(--danger)" />
          Rejected by {typeName ?? "the request type"}
        </div>
        <span className="validity-sub">
          {serverCheck.errorPath ? `at ${serverCheck.errorPath} — ` : ""}
          {serverCheck.errorMessage}
        </span>
      </div>
    );
  }

  if (clientErrors > 0) {
    return (
      <div className="validity bad">
        <div className="validity-line">
          <Warning color="var(--danger)" />
          {clientErrors} field {clientErrors === 1 ? "problem" : "problems"}
        </div>
        <span className="validity-sub">The endpoint may still accept this — the rules come from DataAnnotations.</span>
      </div>
    );
  }

  if (!serverCheck) return <div className="validity" role="status"><div className="validity-line">Server validation pending or unavailable</div><span className="validity-sub">Local checks passed. Server validation has not been confirmed.</span></div>;

  return (
    <div className="validity ok" role="status">
      <div className="validity-line">
        <Check color="var(--success)" />
        Valid against {typeName ?? "the request type"}
      </div>
      <span className="validity-sub">
        Round-tripped through your app's own <code>JsonSerializerOptions</code> — not a copy.
      </span>
    </div>
  );
}
