import {
  friendlyTypeName,
  unwrapToNamed,
  type ApiDocument,
  type EndpointDescriptor,
  type TypeSchema,
  type TypeSchemaRef,
} from "../../api-schema";
import { APP_ROUTES } from "../../../shared/_critical/appMount";

export type EntityKind = "aggregate" | "dto" | "value" | "enum";

export interface EntityTouch {
  endpoint: EndpointDescriptor;
  access: "reads" | "writes";
  /** Which side of the call the type appeared on — what separates a contract from a model. */
  via: "request" | "response";
}

export interface Entity {
  id: string;
  name: string;
  kind: EntityKind;
  schema: TypeSchema;
  touchedBy: EntityTouch[];
  references: TypeSchema[];
}

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * A type the API *accepts* is a transport contract, not a domain model — calling
 * CreateOrderRequest an aggregate would flatter it. A type the API only *returns* is the
 * read model. Anything reached solely through another type is a value object.
 *
 * Accepted-and-returned counts as a DTO: taking a shape from clients is the stronger
 * signal, and it keeps request contracts out of the aggregate list where they'd mislead.
 */
function classify(schema: TypeSchema, touchedBy: EntityTouch[]): EntityKind {
  if (schema.kind === "Enum") return "enum";
  if (touchedBy.some((t) => t.via === "request")) return "dto";
  return touchedBy.length > 0 ? "aggregate" : "value";
}

/**
 * Derives the domain view from the API document: which types are entities, and — the thing
 * a route-centric tool can't tell you — every endpoint that reads or writes each one.
 */
export function deriveEntities(doc: ApiDocument): Entity[] {
  const table = doc.schemas;
  const touches = new Map<string, EntityTouch[]>();

  for (const endpoint of doc.endpoints) {
    const seen = new Set<string>();

    const record = (
      ref: TypeSchemaRef | null | undefined,
      access: "reads" | "writes",
      via: "request" | "response",
    ) => {
      const schema = unwrapToNamed(ref, table);
      if (!schema || schema.kind === "Primitive" || seen.has(schema.id)) return;
      seen.add(schema.id);
      const list = touches.get(schema.id) ?? [];
      list.push({ endpoint, access, via });
      touches.set(schema.id, list);
    };

    record(
      endpoint.requestBody,
      WRITE_METHODS.has(endpoint.httpMethod.toUpperCase()) ? "writes" : "reads",
      "request",
    );
    for (const responseRef of Object.values(endpoint.responses)) {
      record(responseRef, "reads", "response");
    }
  }

  const entities: Entity[] = [];

  for (const schema of Object.values(table)) {
    if (schema.kind !== "Object" && schema.kind !== "Enum") continue;

    const touchedBy = touches.get(schema.id) ?? [];
    const kind: EntityKind = classify(schema, touchedBy);

    const references: TypeSchema[] = [];
    for (const property of schema.properties ?? []) {
      const target = unwrapToNamed(property.schema, table);
      if (target && target.kind !== "Primitive" && !references.some((r) => r.id === target.id)) {
        references.push(target);
      }
    }

    entities.push({
      id: schema.id,
      name: friendlyTypeName(schema.clrTypeName),
      kind,
      schema,
      touchedBy,
      references,
    });
  }

  const order: Record<EntityKind, number> = { aggregate: 0, dto: 1, value: 2, enum: 3 };
  return entities.sort((a, b) => order[a.kind] - order[b.kind] || a.name.localeCompare(b.name));
}

export const UNGROUPED_FEATURE = "Ungrouped";

/** A root type plus the types hanging off it. */
export interface TypeTree {
  root: Entity;
  /** Types reachable only through this root — it is their owner. */
  owned: Entity[];
  /**
   * Types it references that something else already owns. A request DTO legitimately
   * reaches into the domain for its field types and rules; showing those as *borrowed*
   * says so, instead of pretending the contract owns the model.
   */
  borrowed: Entity[];
}

export interface FeatureGroup {
  name: string;
  /** Domain read models — types the API returns. */
  aggregates: TypeTree[];
  /** Transport contracts — types the API accepts. */
  dtos: TypeTree[];
  /** Types in the feature that no root reaches. Usually nothing. */
  orphans: Entity[];
}

/**
 * Groups the domain by feature slice, then roots each feature's types.
 *
 * Aggregates are resolved first and claim the types they reach, so the domain model owns
 * its own vocabulary. DTOs are resolved second: anything already claimed is listed as
 * borrowed rather than re-owned. Traversal stops at another root instead of absorbing its
 * subtree — otherwise one root's dependencies bleed into another's and the view stops
 * telling you who owns what.
 */
export function deriveFeatures(doc: ApiDocument): FeatureGroup[] {
  const entities = deriveEntities(doc);
  const byId = new Map(entities.map((e) => [e.id, e]));
  const rootIds = new Set(entities.filter((e) => e.kind === "aggregate" || e.kind === "dto").map((e) => e.id));
  const claimed = new Set<string>();

  const buildTree = (root: Entity): TypeTree => {
    const owned: Entity[] = [];
    const borrowed: Entity[] = [];
    const seen = new Set<string>([root.id]);

    const walk = (entity: Entity) => {
      for (const reference of entity.references) {
        const child = byId.get(reference.id);
        if (!child || seen.has(child.id)) continue;
        seen.add(child.id);

        // Another root, or a type an earlier root already owns: reference it, don't absorb it.
        if (rootIds.has(child.id) || claimed.has(child.id)) {
          borrowed.push(child);
          continue;
        }

        owned.push(child);
        walk(child);
      }
    };

    walk(root);
    return { root, owned, borrowed };
  };

  const features = new Map<string, FeatureGroup>();
  const featureOf = (entity: Entity) => entity.schema.feature ?? UNGROUPED_FEATURE;

  const groupFor = (name: string): FeatureGroup => {
    let group = features.get(name);
    if (!group) {
      group = { name, aggregates: [], dtos: [], orphans: [] };
      features.set(name, group);
    }
    return group;
  };

  // Aggregates first so the domain model, not a request contract, owns the shared types.
  for (const kind of ["aggregate", "dto"] as const) {
    for (const entity of entities) {
      if (entity.kind !== kind) continue;

      const tree = buildTree(entity);
      const group = groupFor(featureOf(entity));
      (kind === "aggregate" ? group.aggregates : group.dtos).push(tree);

      claimed.add(entity.id);
      for (const owned of tree.owned) claimed.add(owned.id);
    }
  }

  for (const entity of entities) {
    if (!claimed.has(entity.id)) {
      groupFor(featureOf(entity)).orphans.push(entity);
    }
  }

  return [...features.values()].sort((a, b) =>
    a.name === UNGROUPED_FEATURE ? 1 : b.name === UNGROUPED_FEATURE ? -1 : a.name.localeCompare(b.name),
  );
}

/** DTOs live under Contracts, everything else under Domain. */
export function routeForEntity(entity: Entity): string {
  return entity.kind === "dto" ? APP_ROUTES.contract(entity.id) : APP_ROUTES.entity(entity.id);
}
