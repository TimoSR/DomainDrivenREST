import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { fetchApiDocument } from "../../features/api-schema";
import { Logo, Moon, Search, Sun } from "../../shared/ui/Icons";
import { useUiStore } from "../../shared/state/uiStore";

export function TopBar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const refresh = async () => { setRefreshing(true); setRefreshError(false); try { queryClient.setQueryData(["apiDocument"], await fetchApiDocument(true)); } catch { setRefreshError(true); } finally { setRefreshing(false); } };
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);

  const origin = window.location.origin.replace(/^https?:\/\//, "");

  return (
    <header className="topbar">
      <button className="brand" onClick={() => navigate("/")} aria-label="DomainDrivenRest home">
        <Logo />
        <span className="brand-name">Domain<span className="brand-light">DrivenRest</span></span>
      </button>

      <div className="env-chip">
        <span className="dot dot-live" />
        <span>Connected</span>
        <span className="mono">{origin}</span>
      </div>

      <div className="spacer" style={{ display: "flex", justifyContent: "center" }}>
        <button className="search-trigger" onClick={() => setPaletteOpen(true)}>
          <Search color="var(--t3)" />
          <span>Search endpoints, types, history…</span>
          <span className="kbd">Ctrl K</span>
        </button>
      </div>

      <button className="refresh-button" onClick={() => void refresh()} disabled={refreshing} title="Reload schema from the application">{refreshing ? "Refreshing…" : refreshError ? "Retry refresh" : "↻ Refresh schema"}</button>
      {refreshError && <span role="alert">Refresh failed</span>}
      <button
        className="icon-btn"
        onClick={toggleTheme}
        title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      >
        {theme === "dark" ? <Sun /> : <Moon />}
      </button>
    </header>
  );
}
