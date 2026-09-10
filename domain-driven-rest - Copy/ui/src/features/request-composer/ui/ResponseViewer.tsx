import { useState } from "react";
import type { SendRequestResult } from "../infrastructure/requestClient";
import { statusColor } from "../../../shared/domain/methods";
import { JsonHighlight } from "../../../shared/ui/JsonHighlight";

type Tab = "body" | "headers";

/**
 * Status, timing and size, sized to sit inline in the response pane's own header row
 * rather than claim a header of its own — the pane shares a column with the editor.
 */
export function ResponseStats({ result }: { result: SendRequestResult }) {
  return (
    <span className="resp-stats">
      <span className="stat status" style={{ ["--s-color" as string]: statusColor(result.status) }}>
        {result.status} {result.statusText}
      </span>
      <span className="stat">{result.durationMs} ms</span>
      <span className="stat">{formatBytes(new TextEncoder().encode(result.body).length)}</span>
    </span>
  );
}

export function ResponseViewer({ result }: { result: SendRequestResult }) {
  const [tab, setTab] = useState<Tab>("body");

  return (
    <>
      <div className="tabs">
        <button className={tab === "body" ? "active" : ""} onClick={() => setTab("body")}>
          Body
        </button>
        <button className={tab === "headers" ? "active" : ""} onClick={() => setTab("headers")}>
          Headers <span style={{ color: "var(--t4)" }}>{Object.keys(result.headers).length}</span>
        </button>
      </div>

      <div className="col-scroll">
        {tab === "body" ? (
          result.body ? (
            <JsonHighlight text={result.body} />
          ) : (
            <p className="empty-note" style={{ padding: "12px 16px" }}>
              Empty response body.
            </p>
          )
        ) : (
          <div style={{ padding: "12px 16px" }}>
            <table className="headers-table">
              <tbody>
                {Object.entries(result.headers).map(([key, value]) => (
                  <tr key={key}>
                    <td>{key}</td>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function formatBytes(length: number): string {
  if (length < 1024) return `${length} B`;
  return `${(length / 1024).toFixed(1)} kB`;
}
