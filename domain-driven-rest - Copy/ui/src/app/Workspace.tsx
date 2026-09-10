import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ApiDocument } from "../features/api-schema";
import { deriveEntities } from "../features/domain-explorer";
import { relativeTime, useHistoryStore } from "../features/request-composer";
import { APP_ROUTES } from "../shared/_critical/appMount";
import { methodColor, statusColor } from "../shared/domain/methods";
import { Aggregate, Braces, Clock, Search } from "../shared/ui/Icons";

export function Workspace({ doc, historyOnly = false }: { doc: ApiDocument; historyOnly?: boolean }) {
  const navigate = useNavigate();
  const history = useHistoryStore(s => s.entries);
  const clear = useHistoryStore(s => s.clear);
  const [filter, setFilter] = useState("");
  const [feature, setFeature] = useState("All features");
  const [confirmClear, setConfirmClear] = useState(false);
  const features = useMemo(() => [...new Set(doc.endpoints.map(e => e.feature))].sort(), [doc]);
  const endpoints = doc.endpoints.filter(e => (feature === "All features" || e.feature === feature) && `${e.httpMethod} ${e.relativePath} ${e.feature}`.toLowerCase().includes(filter.toLowerCase()));
  const entries = history.filter(e => `${e.method} ${e.path} ${e.status}`.toLowerCase().includes(filter.toLowerCase()));
  const first = doc.endpoints.find(e => e.requestBody) ?? doc.endpoints[0];
  return <main className="workspace" id="main-content">
    <div className="workspace-breadcrumb">Workspace <span>/</span> {historyOnly ? "Request history" : "Overview"}</div>
    <div className="workspace-content">
      <div className="page-heading"><div><div className="overline">YOUR API, CONNECTED</div><h1>{historyOnly ? "Request history" : "API workspace"}</h1><p>{historyOnly ? "A local record of your requests. Open an endpoint to compose a new request." : "Explore your domain. Build with confidence."}</p></div>
        {!historyOnly && first && <button className="primary-action" onClick={() => navigate(APP_ROUTES.endpoint(first.operationId))}>Compose a request <span>↗</span></button>}
        {historyOnly && history.length > 0 && <button className="chip-btn" onClick={() => { if (confirmClear) { clear(); setConfirmClear(false); } else setConfirmClear(true); }}>{confirmClear ? "Confirm clear history" : "Clear history"}</button>}
      </div>
      {!historyOnly && <>
        <div className="metric-grid">
          <div className="metric"><Braces size={19}/><span>Endpoints</span><strong>{doc.endpoints.length}</strong><small>Ready to explore</small></div>
          <div className="metric"><Aggregate size={19}/><span>Domain types</span><strong>{deriveEntities(doc).length}</strong><small>From your application schema</small></div>
          <div className="metric"><span className="metric-glyph">▦</span><span>Features</span><strong>{features.length}</strong><small>Organized by capability</small></div>
          <div className="metric"><Clock size={19}/><span>Requests sent</span><strong>{history.length}</strong><small>In this browser’s history</small></div>
        </div>
        <div className="explore-banner"><div className="banner-icon"><Aggregate size={24}/></div><div><h2>See the domain behind your routes</h2><p>Explore types, relationships, and the endpoints that use them.</p></div><button className="chip-btn" onClick={() => navigate(APP_ROUTES.domain)}>Explore domain <span>→</span></button></div>
      </>}
      <div className="section-heading"><div><h2>{historyOnly ? "Past requests" : "Endpoint directory"} <span className="number-tag">{historyOnly ? entries.length : endpoints.length}</span></h2><p>{historyOnly ? "Stored on this device, including request bodies. Authorization headers are never saved." : "Select an endpoint to open its generated request form."}</p></div></div>
      <div className="directory-controls"><div className="directory-search"><Search size={16}/><input aria-label={historyOnly ? "Search request history" : "Search endpoints"} placeholder={historyOnly ? "Search requests…" : "Search endpoints by path, method, or feature…"} value={filter} onChange={e => setFilter(e.target.value)}/>{filter && <button aria-label="Clear search" onClick={() => setFilter("")}>×</button>}</div>{!historyOnly && <select aria-label="Filter by feature" value={feature} onChange={e => setFeature(e.target.value)}><option>All features</option>{features.map(f => <option key={f}>{f}</option>)}</select>}</div>
      <div className="endpoint-table">
        <div className="directory-row directory-labels"><span>METHOD</span><span>{historyOnly ? "REQUEST" : "ENDPOINT"}</span><span>{historyOnly ? "STATUS · TIME" : "FEATURE"}</span><span/></div>
        {historyOnly ? entries.map(e => <button className="directory-row" key={e.id} onClick={() => navigate(APP_ROUTES.endpoint(e.operationId))}><span className="method" style={{ "--m-color": methodColor(e.method) } as React.CSSProperties}>{e.method}</span><span className="directory-path">{e.path}<small>{relativeTime(e.at)}</small></span><span style={{ color: statusColor(e.status) }}>{e.status} <span className="faint">· {e.durationMs} ms</span></span><span className="row-arrow">↗</span></button>) : endpoints.map(e => <button className="directory-row" key={e.operationId} onClick={() => navigate(APP_ROUTES.endpoint(e.operationId))}><span className="method" style={{ "--m-color": methodColor(e.httpMethod) } as React.CSSProperties}>{e.httpMethod}</span><span className="directory-path">/{e.relativePath}<small>{e.requestBody ? "Request body" : e.parameters.length ? `${e.parameters.length} parameters` : "No parameters"} <span>·</span> {Object.keys(e.responses).join(", ") || "Response"}</small></span><span className="feature-tag">{e.feature}</span><span className="row-arrow">↗</span></button>)}
        {(historyOnly ? entries : endpoints).length === 0 && <div className="directory-empty"><Search size={24}/><h3>{filter || feature !== "All features" ? "No matching results" : historyOnly ? "Your first request starts here" : "No endpoints discovered"}</h3><p>{filter || feature !== "All features" ? "Try another search or choose a different feature." : historyOnly ? "Send a request from the composer and it will appear here." : "Register your API endpoints, then refresh the schema."}</p>{(filter || feature !== "All features") && <button className="chip-btn" onClick={() => {setFilter(""); setFeature("All features");}}>Reset filters</button>}</div>}
      </div>
      <div className="workspace-note"><span className="dot dot-live"/> Schema generated from your application <span className="spacer"/> Built for the way you model your domain.</div>
    </div>
  </main>;
}
