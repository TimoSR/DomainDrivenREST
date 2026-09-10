import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ApiDocument } from "../../api-schema";
import { deriveEntities, routeForEntity } from "../../domain-explorer";
import { methodColor, methodIsSolid, methodLabel, statusColor } from "../../../shared/domain/methods";
import { useUiStore } from "../../../shared/state/uiStore";
import { useHistoryStore, relativeTime } from "../../request-composer";
import { Aggregate, Clock, EnumIcon, Moon, Search, Sun, ValueObject } from "../../../shared/ui/Icons";
import { APP_ROUTES } from "../../../shared/_critical/appMount";
import { HISTORY_PALETTE_LIMIT } from "../../../shared/_critical/uiDefaults";

interface Item {
  id: string;
  group: string;
  primary: string;
  secondary?: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  run: () => void;
}

export function CommandPalette({ doc }: { doc: ApiDocument }) {
  const navigate = useNavigate();
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const theme = useUiStore((s) => s.theme);
  const history = useHistoryStore((s) => s.entries);
  const clearHistory = useHistoryStore((s) => s.clear);

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    return () => previous?.focus();
  }, []);

  const close = () => setPaletteOpen(false);

  const items = useMemo<Item[]>(() => {
    const entities = deriveEntities(doc);
    const all: Item[] = [];

    for (const endpoint of doc.endpoints) {
      all.push({
        id: `ep-${endpoint.operationId}`,
        group: "Endpoints",
        primary: `/${endpoint.relativePath}`,
        secondary: endpoint.groupName,
        badge: (
          <span
            className={`method${methodIsSolid(endpoint.httpMethod) ? " solid" : ""}`}
            style={{ ["--m-color" as string]: methodColor(endpoint.httpMethod) }}
          >
            {methodLabel(endpoint.httpMethod)}
          </span>
        ),
        run: () => {
          navigate(APP_ROUTES.endpoint(endpoint.operationId));
          close();
        },
      });
    }

    for (const entity of entities) {
      const Icon = entity.kind === "aggregate" ? Aggregate : entity.kind === "enum" ? EnumIcon : ValueObject;
      all.push({
        id: `ty-${entity.id}`,
        group: "Types",
        primary: entity.name,
        secondary:
          entity.kind === "enum"
            ? (entity.schema.enumMembers ?? []).map((m) => m.name).join(" · ")
            : entity.touchedBy.length > 0
              ? `${entity.touchedBy.length} endpoint${entity.touchedBy.length === 1 ? "" : "s"}`
              : `${entity.schema.properties?.length ?? 0} fields`,
        icon: <Icon color={entity.kind === "aggregate" ? "var(--accent-2)" : "var(--t3)"} size={15} />,
        run: () => {
          navigate(routeForEntity(entity));
          close();
        },
      });
    }

    for (const entry of history.slice(0, HISTORY_PALETTE_LIMIT)) {
      all.push({
        id: `hi-${entry.id}`,
        group: "Recent",
        primary: `${entry.method} ${entry.path}`,
        secondary: `${relativeTime(entry.at)} · ${entry.durationMs} ms`,
        icon: <Clock color="var(--t3)" size={15} />,
        badge: (
          <span
            className="stat status"
            style={{ ["--s-color" as string]: statusColor(entry.status), fontSize: "var(--fs-tiny)", padding: "1px 6px" }}
          >
            {entry.status}
          </span>
        ),
        run: () => {
          navigate(APP_ROUTES.endpoint(entry.operationId));
          close();
        },
      });
    }

    all.push({
      id: "ac-theme",
      group: "Actions",
      primary: `Switch to ${theme === "dark" ? "light" : "dark"} theme`,
      icon: theme === "dark" ? <Sun color="var(--t3)" size={15} /> : <Moon color="var(--t3)" size={15} />,
      run: () => {
        toggleTheme();
        close();
      },
    });

    if (history.length > 0) {
      all.push({
        id: "ac-clear",
        group: "Actions",
        primary: "Clear request history",
        secondary: `${history.length} ${history.length === 1 ? "entry" : "entries"}`,
        icon: <Clock color="var(--t3)" size={15} />,
        run: () => {
          clearHistory();
          close();
        },
      });
    }

    return all;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, history, theme]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => `${item.primary} ${item.secondary ?? ""} ${item.group}`.toLowerCase().includes(q));
  }, [items, query]);

  useEffect(() => setSelected(0), [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => Math.max(0, Math.min(s + 1, filtered.length - 1)));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        filtered[selected]?.run();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, selected]);

  useEffect(() => {
    listRef.current?.querySelector(".palette-row.selected")?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const groups = useMemo(() => {
    const order = ["Endpoints", "Types", "Recent", "Actions"];
    return order
      .map((group) => ({ group, items: filtered.filter((i) => i.group === group) }))
      .filter((g) => g.items.length > 0);
  }, [filtered]);

  return (
    <div className="palette-scrim" onMouseDown={close}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Search workspace" onMouseDown={(e) => e.stopPropagation()} onKeyDown={e => {
        if (e.key !== "Tab") return;
        const targets = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button, input'));
        const first = targets[0], last = targets[targets.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }}>
        <div className="palette-input">
          <Search size={17} color="var(--accent)" />
          <input
            aria-label="Search workspace"
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search endpoints, types, history…"
          />
          <span style={{ fontSize: "var(--fs-body)", color: "var(--punct)" }}>
            {filtered.length} result{filtered.length === 1 ? "" : "s"}
          </span>
          <span className="kbd">esc</span>
        </div>

        <div className="palette-results" ref={listRef}>
          {groups.map(({ group, items: groupItems }) => (
            <div className="palette-group" key={group}>
              <div className="eyebrow">{group}</div>
              {groupItems.map((item) => {
                const index = filtered.indexOf(item);
                return (
                  <button
                    key={item.id}
                    className={`palette-row${index === selected ? " selected" : ""}`}
                    onMouseEnter={() => setSelected(index)}
                    onClick={item.run}
                  >
                    <span className="icon-slot">{item.badge ?? item.icon}</span>
                    <span className="primary">{item.primary}</span>
                    {item.secondary && <span className="secondary">{item.secondary}</span>}
                    {item.badge && item.icon && <span style={{ marginLeft: "auto" }}>{item.icon}</span>}
                  </button>
                );
              })}
            </div>
          ))}

          {filtered.length === 0 && (
            <p className="empty-note" style={{ padding: "16px 12px" }}>
              Nothing matches “{query}”.
            </p>
          )}
        </div>

        <div className="palette-foot">
          <span className="item">
            <span className="kbd">↑↓</span> navigate
          </span>
          <span className="item">
            <span className="kbd">⏎</span> open
          </span>
          <span className="spacer" />
          <span>Everything in the API, one keystroke away</span>
        </div>
      </div>
    </div>
  );
}
