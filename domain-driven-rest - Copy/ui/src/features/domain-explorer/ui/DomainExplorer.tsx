import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  friendlyTypeName,
  resolveSchema,
  schemaLabel,
  type ApiDocument,
  type TypeSchema,
} from "../../api-schema";
import { deriveEntities, routeForEntity, type Entity } from "../domain/entities";
import { methodColor, methodIsSolid, methodLabel } from "../../../shared/domain/methods";
import { APP_ROUTES } from "../../../shared/_critical/appMount";

const KIND_LABELS: Record<Entity["kind"], string> = {
  aggregate: "Aggregate",
  dto: "DTO",
  value: "Value object",
  enum: "Enum",
};

const KIND_LEDES: Record<Entity["kind"], string> = {
  aggregate:
    "A domain read model. Everything the API exposes for this type in one place — the shape, the routes that read or write it, and what it pulls in.",
  dto: "A transport contract: a shape the API accepts from clients. It borrows its field types and validation rules from the domain rather than owning them.",
  value: "Reached only through other types — it has no endpoint of its own.",
  enum: "A closed set of values. The composer renders these as a picker rather than a free-text field.",
};

export function DomainExplorer({ doc, only }: { doc: ApiDocument; only?: "dto" | "domain" }) {
  const { entityId } = useParams<{ entityId: string }>();
  const navigate = useNavigate();
  const entities = useMemo(() => deriveEntities(doc), [doc]);

  // With no explicit selection, land on something the current tab actually lists.
  const fallback = only
    ? entities.find((e) => (only === "dto" ? e.kind === "dto" : e.kind !== "dto"))
    : entities[0];
  const entity = entityId ? entities.find((e) => e.id === entityId) : fallback;

  if (!entity) {
    return (
      <div className="placeholder">
        <h2>{only === "dto" ? "No request contracts found" : "No domain types found"}</h2>
        <p>
          {only === "dto"
            ? "Contracts appear here once an endpoint accepts a request body."
            : "Domain types appear here once an endpoint returns one."}
        </p>
      </div>
    );
  }

  const kindLabel = KIND_LABELS[entity.kind];

  return (
    <div className="composer">
      <section className="entity-detail">
        <div className="entity-head">
          <h1>
            {entity.name}
            <span className="tag">{kindLabel}</span>
          </h1>
          <p className="entity-lede">{KIND_LEDES[entity.kind]}</p>
          <span className="clr-name">{entity.schema.clrTypeName.split(",")[0]}</span>
        </div>

        <div className="entity-body">
          {entity.schema.kind === "Enum" ? (
            <section style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              <div className="section-head">
                Members
                <span className="rule" />
                <span className="count">
                  {entity.schema.enumMembers?.length ?? 0} · serialized as{" "}
                  {entity.schema.isStringEnum ? "name" : "number"}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {(entity.schema.enumMembers ?? []).map((member) => (
                  <div className="shape-row" key={member.name}>
                    <span className="fname">{member.name}</span>
                    <span className="ftype" style={{ color: "var(--warn)" }}>
                      {String(member.value)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <section style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              <div className="section-head">
                Shape
                <span className="rule" />
                <span className="count">{entity.schema.properties?.length ?? 0} fields</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {(entity.schema.properties ?? []).map((property) => {
                  const fieldSchema = resolveSchema(property.schema, doc.schemas);
                  return (
                    <div className="shape-row" key={property.name}>
                      <span className="fname">{property.name}</span>
                      <span className="ftype" style={{ color: typeColor(fieldSchema) }}>
                        {schemaLabel(fieldSchema, doc.schemas)}
                      </span>
                      {property.required ? (
                        <span className="req" style={{ fontSize: "var(--fs-micro)", fontWeight: 600, color: "var(--danger)" }}>
                          REQUIRED
                        </span>
                      ) : null}
                      <span className="fnote">{fieldNote(fieldSchema, property.rules)}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            <div className="section-head">
              Touched by
              <span className="rule" />
              <span className="count">
                {entity.touchedBy.length} {entity.touchedBy.length === 1 ? "endpoint" : "endpoints"}
              </span>
            </div>
            {entity.touchedBy.length === 0 ? (
              <p className="empty-note">
                No endpoint exposes this type directly — it is reached through another type.
              </p>
            ) : (
              <div className="touched-grid">
                {entity.touchedBy.map(({ endpoint, access }, i) => (
                  <button
                    className="touched"
                    key={`${endpoint.operationId}-${i}`}
                    onClick={() => navigate(APP_ROUTES.endpoint(endpoint.operationId))}
                  >
                    <span
                      className={`method${methodIsSolid(endpoint.httpMethod) ? " solid" : ""}`}
                      style={{ ["--m-color" as string]: methodColor(endpoint.httpMethod), minWidth: 42 }}
                    >
                      {methodLabel(endpoint.httpMethod)}
                    </span>
                    <span className="path">/{endpoint.relativePath}</span>
                    <span className="rw" style={{ color: access === "writes" ? "var(--success)" : undefined }}>
                      {access}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>

      <section className="graph-pane">
        <div className="pane-head">
          <span>Type graph</span>
          <span className="spacer" />
          <span style={{ fontSize: "var(--fs-small)", fontWeight: 400, color: "var(--t3)" }}>depth 1</span>
        </div>
        <div className="graph-scroll">
          <TypeGraph
            entity={entity}
            onSelect={(id) => {
              const target = entities.find((e) => e.id === id);
              if (target) navigate(routeForEntity(target));
            }}
          />
        </div>
      </section>
    </div>
  );
}

function typeColor(schema: TypeSchema | undefined): string {
  if (!schema) return "var(--t3)";
  if (schema.kind === "Enum") return "var(--warn)";
  if (schema.kind === "Object" || schema.kind === "Array" || schema.kind === "Dictionary") return "var(--accent)";
  return "var(--info)";
}

function fieldNote(schema: TypeSchema | undefined, rules: { minimum?: number | null; maximum?: number | null; pattern?: string | null } | null | undefined): string {
  if (schema?.kind === "Enum") {
    return (schema.enumMembers ?? []).map((m) => m.name).join(" · ");
  }
  if (rules?.pattern) return rules.pattern;
  if (rules?.minimum != null || rules?.maximum != null) {
    return `${rules.minimum ?? "…"} – ${rules.maximum ?? "…"}`;
  }
  return "";
}

/* Node and gap geometry. These were half again as big — 168×74 boxes with 112px of
   vertical run between rows meant a type with three references filled a whole pane to
   say very little. Everything here is sized off the text it has to hold, nothing more. */
const NODE_W = 124;
const NODE_H = 46;
const NODE_PAD = 11;
const COL_GAP = 14;
const ROW_GAP = 54;
const TOP_PAD = 22;

/** Root type on top, everything it directly references fanned out beneath it. */
function TypeGraph({ entity, onSelect }: { entity: Entity; onSelect: (id: string) => void }) {
  const children = entity.references;
  const perRow = Math.max(1, Math.min(3, children.length));
  const rows = Math.ceil(children.length / perRow) || 1;

  const width = Math.max(perRow * NODE_W + (perRow - 1) * COL_GAP, NODE_W) + 24;
  const height = TOP_PAD + NODE_H + (children.length > 0 ? rows * (NODE_H + ROW_GAP) : 34);
  const rootX = width / 2 - NODE_W / 2;
  const rootCx = width / 2;
  const rootBottom = TOP_PAD + NODE_H;

  const childPos = children.map((_, index) => {
    const row = Math.floor(index / perRow);
    const col = index % perRow;
    const inRow = Math.min(perRow, children.length - row * perRow);
    const rowWidth = inRow * NODE_W + (inRow - 1) * COL_GAP;
    const x = (width - rowWidth) / 2 + col * (NODE_W + COL_GAP);
    const y = rootBottom + ROW_GAP + row * (NODE_H + ROW_GAP);
    return { x, y, cx: x + NODE_W / 2 };
  });

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
      {childPos.map((pos, i) => (
        <path
          key={`edge-${i}`}
          className="gedge"
          strokeWidth="1"
          d={`M${rootCx} ${rootBottom}C${rootCx} ${rootBottom + ROW_GAP * 0.55} ${pos.cx} ${pos.y - ROW_GAP * 0.5} ${pos.cx} ${pos.y}`}
        />
      ))}

      <g>
        <rect
          x={rootX}
          y={TOP_PAD}
          width={NODE_W}
          height={NODE_H}
          rx="3"
          className="gnode-root"
          strokeWidth="1"
        />
        <text x={rootX + NODE_PAD} y={TOP_PAD + 19} className="glabel" fontWeight="600">
          {truncate(entity.name, 15)}
        </text>
        <text x={rootX + NODE_PAD} y={TOP_PAD + 33} className="gsub">
          {entity.schema.kind === "Enum"
            ? `${entity.schema.enumMembers?.length ?? 0} members`
            : `${entity.schema.properties?.length ?? 0} fields`}
        </text>
      </g>

      {children.map((child, i) => (
        <g key={child.id} onClick={() => onSelect(child.id)} style={{ cursor: "pointer" }}>
          <rect
            x={childPos[i].x}
            y={childPos[i].y}
            width={NODE_W}
            height={NODE_H}
            rx="3"
            className="gnode"
            strokeWidth="1"
          />
          <text
            x={childPos[i].x + NODE_PAD}
            y={childPos[i].y + 19}
            className="glabel"
            fill={child.kind === "Enum" ? "var(--warn)" : "var(--accent)"}
          >
            {truncate(friendlyTypeName(child.clrTypeName), 15)}
          </text>
          <text x={childPos[i].x + NODE_PAD} y={childPos[i].y + 33} className="gsub">
            {child.kind === "Enum"
              ? truncate((child.enumMembers ?? []).map((m) => m.name).join(" · "), 17)
              : truncate((child.properties ?? []).map((p) => p.name).join(", "), 17)}
          </text>
        </g>
      ))}

      {children.length === 0 && (
        <text x={width / 2} y={rootBottom + 22} className="gsub" textAnchor="middle">
          Only primitive fields — nothing further to expand.
        </text>
      )}
    </svg>
  );
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
