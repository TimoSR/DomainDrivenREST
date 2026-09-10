import { useCallback, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import type { ApiDocument, EndpointDescriptor } from "../../features/api-schema";
import { methodColor, methodIsSolid, methodLabel } from "../../shared/domain/methods";
import { deriveFeatures, routeForEntity, type Entity, type FeatureGroup } from "../../features/domain-explorer";
import { Aggregate, Chevron, Clock, Dto, EnumIcon, Search, ValueObject } from "../../shared/ui/Icons";
import { useHistoryStore } from "../../features/request-composer";
import { RAIL_GROUPS_COLLAPSED_BY_DEFAULT } from "../../shared/_critical/uiDefaults";
import { APP_ROUTES } from "../../shared/_critical/appMount";

interface RailProps {
  doc: ApiDocument;
}

export function Rail({ doc }: RailProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [filter, setFilter] = useState("");
  const historyCount = useHistoryStore((s) => s.entries.length);

  const mode: "routes" | "contracts" | "domain" = location.pathname.startsWith(APP_ROUTES.contracts)
    ? "contracts"
    : location.pathname.startsWith(APP_ROUTES.domain)
      ? "domain"
      : "routes";


  // The rail renders alongside <Routes>, not inside it, so useParams() would be empty here.
  const activeOperationId = matchSegment(location.pathname, "endpoints");
  const activeEntityId =
    matchSegment(location.pathname, "domain") || matchSegment(location.pathname, "contracts");

  const query = filter.trim().toLowerCase();

  // Routes group by feature slice, matching how the code is organised rather than how the
  // URLs happen to be spelled.
  const routeGroups = useMemo(() => {
    const groups = new Map<string, EndpointDescriptor[]>();
    for (const endpoint of doc.endpoints) {
      if (query && !`${endpoint.httpMethod} ${endpoint.relativePath} ${endpoint.feature}`.toLowerCase().includes(query)) continue;
      const list = groups.get(endpoint.feature) ?? [];
      list.push(endpoint);
      groups.set(endpoint.feature, list);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [doc, query]);

  const featureGroups = useMemo(() => {
    const all = deriveFeatures(doc);
    if (!query) return all;

    // Keep a root whose own name or any type beneath it matches, narrowed to the matches.
    const narrow = (trees: FeatureGroup["aggregates"]) =>
      trees
        .map((tree) => ({
          ...tree,
          owned: tree.owned.filter((e) => e.name.toLowerCase().includes(query)),
          borrowed: tree.borrowed.filter((e) => e.name.toLowerCase().includes(query)),
        }))
        .filter(
          (tree) =>
            tree.root.name.toLowerCase().includes(query) || tree.owned.length > 0 || tree.borrowed.length > 0,
        );

    return all
      .map((feature) => ({
        ...feature,
        aggregates: narrow(feature.aggregates),
        dtos: narrow(feature.dtos),
        orphans: feature.orphans.filter((e) => e.name.toLowerCase().includes(query)),
      }))
      .filter((f) => f.aggregates.length > 0 || f.dtos.length > 0 || f.orphans.length > 0);
  }, [doc, query]);

  // Only groups the user has actually clicked are recorded; everything else falls back to
  // the system default, so the resting state stays honest to _critical/uiDefaults.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  const toggleGroup = useCallback(
    (key: string, currentlyExpanded: boolean) => setToggled((prev) => ({ ...prev, [key]: !currentlyExpanded })),
    [],
  );

  const isExpanded = useCallback(
    (key: string, containsActive: boolean) => {
      // A filter must always reveal its matches, even over an explicit collapse.
      if (query) return true;
      return toggled[key] ?? (containsActive || !RAIL_GROUPS_COLLAPSED_BY_DEFAULT);
    },
    [query, toggled],
  );

  return (
    <nav className="rail" aria-label="API navigation">
      <div className="rail-workspace"><span className="workspace-avatar">D</span><div><strong>Development workspace</strong><small>ASP.NET Core API</small></div></div>
      <button className={`overview-link${location.pathname === "/" ? " active" : ""}`} onClick={() => navigate(APP_ROUTES.home)}><span>▦</span> Overview <span className="spacer"/><span>↗</span></button>
      <div className="rail-head">
        <div className="segmented">
          <button className={mode === "routes" ? "active" : ""} onClick={() => navigate(APP_ROUTES.home)}>
            Routes
          </button>
          <button className={mode === "contracts" ? "active" : ""} onClick={() => navigate(APP_ROUTES.contracts)}>
            Contracts
          </button>
          <button className={mode === "domain" ? "active" : ""} onClick={() => navigate(APP_ROUTES.domain)}>
            Domain
          </button>
        </div>
        <div className="rail-filter">
          <Search size={12} color="var(--t3)" />
          <input
            aria-label="Filter navigation" value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={mode === "routes" ? "Filter routes" : mode === "contracts" ? "Filter contracts" : "Filter types"}
          />
        </div>
      </div>

      <div className="rail-scroll">
        {mode === "routes"
          ? routeGroups.map(([group, endpoints]) => {
              const containsActive = endpoints.some((e) => e.operationId === activeOperationId);
              const expanded = isExpanded(`route:${group}`, containsActive);
              return (
                <div className="rail-group" key={group}>
                  <GroupHeader
                    label={group}
                    count={endpoints.length}
                    expanded={expanded}
                    onToggle={() => toggleGroup(`route:${group}`, expanded)}
                  />
                  {expanded &&
                    endpoints.map((endpoint) => (
                      <RouteRow
                        key={endpoint.operationId}
                        endpoint={endpoint}
                        active={activeOperationId === endpoint.operationId}
                        onSelect={() => navigate(APP_ROUTES.endpoint(endpoint.operationId))}
                      />
                    ))}
                </div>
              );
            })
          : featureGroups.map((feature) => {
              // Contracts and Domain are the same tree, split by which roots belong to each.
              const trees = mode === "contracts" ? feature.dtos : feature.aggregates;
              const orphans = mode === "contracts" ? [] : feature.orphans;
              if (trees.length === 0 && orphans.length === 0) return null;

              const ids = trees.flatMap((t) => [t.root.id, ...t.owned.map((o) => o.id)]);
              const containsActive = ids.includes(activeEntityId) || orphans.some((o) => o.id === activeEntityId);
              const expanded = isExpanded(`${mode}:${feature.name}`, containsActive);

              const renderRow = (child: Entity, borrowed = false) => (
                <EntityRow
                  key={child.id}
                  entity={child}
                  owned
                  borrowed={borrowed}
                  active={activeEntityId === child.id}
                  onSelect={() => navigate(routeForEntity(child))}
                />
              );

              return (
                <div className="rail-group" key={feature.name}>
                  <GroupHeader
                    label={feature.name}
                    count={ids.length + orphans.length}
                    expanded={expanded}
                    onToggle={() => toggleGroup(`${mode}:${feature.name}`, expanded)}
                  />
                  {expanded && (
                    <>
                      {trees.map((tree) => (
                        <div key={tree.root.id} className="aggregate-tree">
                          <EntityRow
                            entity={tree.root}
                            active={activeEntityId === tree.root.id}
                            onSelect={() => navigate(routeForEntity(tree.root))}
                          />
                          {tree.owned.map((child) => renderRow(child))}
                          {tree.borrowed.map((child) => renderRow(child, true))}
                        </div>
                      ))}
                      {orphans.map((entity) => (
                        <EntityRow
                          key={entity.id}
                          entity={entity}
                          active={activeEntityId === entity.id}
                          onSelect={() => navigate(routeForEntity(entity))}
                        />
                      ))}
                    </>
                  )}
                </div>
              );
            })}

        {(mode === "routes" ? routeGroups.length === 0 : !featureGroups.some(f => mode === "contracts" ? f.dtos.length > 0 : f.aggregates.length > 0 || f.orphans.length > 0)) && (
          <p className="empty-note" style={{ padding: "0 8px" }}>
            Nothing matches “{filter}”.
          </p>
        )}
      </div>

      <button className="rail-foot" onClick={() => navigate("/history")}>
        <Clock color="var(--t3)" />
        <span style={{ flexGrow: 1 }}>History</span>
        <span className="mono" style={{ fontSize: "var(--fs-tiny)", color: "var(--t3)" }}>
          {historyCount}
        </span>
      </button>
    </nav>
  );
}

/** Reads the id out of "/endpoints/<id>" or "/domain/<id>"; empty when that isn't the route. */
function matchSegment(pathname: string, prefix: string): string {
  const match = pathname.match(new RegExp(`^/${prefix}/(.+)$`));
  return match ? decodeURIComponent(match[1]) : "";
}

function GroupHeader({
  label,
  count,
  expanded,
  onToggle,
}: {
  label: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button className="eyebrow eyebrow-toggle" onClick={onToggle} aria-expanded={expanded}>
      <span className={`eyebrow-chevron${expanded ? "" : " collapsed"}`}>
        <Chevron size={11} color="var(--t3)" />
      </span>
      <span>{label}</span>
      <span className="count">{count}</span>
    </button>
  );
}

function RouteRow({
  endpoint,
  active,
  onSelect,
}: {
  endpoint: EndpointDescriptor;
  active: boolean;
  onSelect: () => void;
}) {
  const color = methodColor(endpoint.httpMethod);
  const segments = endpoint.relativePath.split(/(\{[^}]+\})/);

  return (
    <button
      className={`rail-item${active ? " active" : ""}`}
      style={{ ["--m-color" as string]: color }}
      onClick={onSelect}
    >
      <span className={`method${methodIsSolid(endpoint.httpMethod) ? " solid" : ""}`}>
        {methodLabel(endpoint.httpMethod)}
      </span>
      <span className="path">
        /
        {segments.map((segment, i) =>
          segment.startsWith("{") ? (
            <span className="param" key={i}>
              {segment}
            </span>
          ) : (
            segment
          ),
        )}
      </span>
    </button>
  );
}

const entityIcons = { aggregate: Aggregate, dto: Dto, enum: EnumIcon, valueObject: ValueObject };

function entityAccent(kind: Entity["kind"]): string {
  if (kind === "aggregate") return "var(--accent-2)";
  if (kind === "dto") return "var(--info)";
  return "var(--t3)";
}

function EntityRow({
  entity,
  active,
  owned = false,
  borrowed = false,
  onSelect,
}: {
  entity: Entity;
  active: boolean;
  owned?: boolean;
  /** Owned by another root — shown here because this type references it. */
  borrowed?: boolean;
  onSelect: () => void;
}) {
  const Icon = entityIcons[entity.kind as keyof typeof entityIcons] ?? ValueObject;
  const accent = entityAccent(entity.kind);

  return (
    <button
      className={`rail-item${active ? " active" : ""}${owned ? " owned" : ""}${borrowed ? " borrowed" : ""}`}
      style={{ ["--m-color" as string]: accent }}
      onClick={onSelect}
      title={borrowed ? `${entity.name} — owned elsewhere, referenced here` : undefined}
    >
      <Icon color={active ? accent : borrowed ? "var(--t4)" : accent} />
      <span className="path" style={{ fontSize: "var(--fs-mid)" }}>
        {entity.name}
      </span>
      {entity.touchedBy.length > 0 && (
        <span style={{ marginLeft: "auto", fontSize: "var(--fs-tiny)", color: "var(--t4)" }}>{entity.touchedBy.length}</span>
      )}
    </button>
  );
}
