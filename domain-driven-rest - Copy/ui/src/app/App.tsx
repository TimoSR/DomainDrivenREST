import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchApiDocument } from "../features/api-schema";
import { Workspace } from "./Workspace";
import { deriveEntities } from "../features/domain-explorer";
import { useUiStore } from "../shared/state/uiStore";
import { TopBar } from "./shell/TopBar";
import { Rail } from "./shell/Rail";
import { Composer } from "../features/request-composer";
import { DomainExplorer } from "../features/domain-explorer";
import { CommandPalette } from "../features/command-palette";
import { Logo } from "../shared/ui/Icons";
import { APP_ROUTES } from "../shared/_critical/appMount";

export default function App() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["apiDocument"], queryFn: () => fetchApiDocument() });
  const paletteOpen = useUiStore((s) => s.paletteOpen);
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(!useUiStore.getState().paletteOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setPaletteOpen]);

  if (isLoading) {
    return (
      <div className="app">
        <div className="placeholder">
          <Logo size={32} />
          <p>Reading your API schema…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="app">
        <div className="placeholder">
          <h2>Could not load the schema</h2>
          <p>{(error as Error)?.message ?? "The schema endpoint returned nothing."}</p><button className="primary-action" onClick={() => void refetch()}>Retry connection</button>
        </div>
      </div>
    );
  }

  const entityCount = deriveEntities(data).length;

  return (
    <div className="app">
      <TopBar />
      <div className="app-body">
        <Rail doc={data} />
        <Routes>
          <Route path={APP_ROUTES.home} element={<Workspace doc={data} />} />
          <Route path="/history" element={<Workspace doc={data} historyOnly />} />
          <Route path="*" element={<Navigate to={APP_ROUTES.home} replace />} />
          <Route path={APP_ROUTES.endpointPattern} element={<Composer doc={data} />} />
          <Route path={APP_ROUTES.contracts} element={<DomainExplorer doc={data} only="dto" />} />
          <Route path={APP_ROUTES.contractPattern} element={<DomainExplorer doc={data} />} />
          <Route path={APP_ROUTES.domain} element={<DomainExplorer doc={data} only="domain" />} />
          <Route path={APP_ROUTES.entityPattern} element={<DomainExplorer doc={data} />} />
        </Routes>
      </div>

      <footer className="statusbar">
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className="dot dot-live" />
          Schema loaded
        </span>
        <span className="faint">{data.endpoints.length} endpoints</span>
        <span className="faint">{entityCount} types</span>
        <span className="spacer" />
        <span className="hint">Ctrl K palette</span>
        <span className="hint">Ctrl Enter send</span>
      </footer>

      {paletteOpen && <CommandPalette doc={data} />}
    </div>
  );
}
