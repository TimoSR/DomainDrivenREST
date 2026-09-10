import type { TypeSchema, TypeSchemaRef } from "../_dto/apiDocument";

/** Resolves a ref against the document's flat schema table (or returns its inlined schema). */
export function resolveSchema(
  ref: TypeSchemaRef | null | undefined,
  table: Record<string, TypeSchema>,
): TypeSchema | undefined {
  if (!ref) return undefined;
  if (ref.inline) return ref.inline;
  if (ref.ref) return table[ref.ref];
  return undefined;
}

/** Unwraps arrays/dictionaries down to the named type a ref ultimately points at. */
export function unwrapToNamed(
  ref: TypeSchemaRef | null | undefined,
  table: Record<string, TypeSchema>,
): TypeSchema | undefined {
  const schema = resolveSchema(ref, table);
  if (!schema) return undefined;
  if (schema.kind === "Array") return unwrapToNamed(schema.items, table);
  if (schema.kind === "Dictionary") return unwrapToNamed(schema.additionalProperties, table);
  return schema;
}

/** "System.Collections.Generic.List`1[[DemoApi.Models.OrderLine, ...]]" -> "List<OrderLine>" */
export function friendlyTypeName(clrTypeName: string): string {
  const generic = clrTypeName.match(/^([^`]+)`\d+\[\[(.+)\]\]$/);
  if (generic) {
    const outer = shortName(generic[1]);
    const args = splitGenericArgs(generic[2]).map((a) => friendlyTypeName(a.split(",")[0].trim()));
    return `${outer}<${args.join(", ")}>`;
  }
  return shortName(clrTypeName);
}

function shortName(clrTypeName: string): string {
  const withoutAssembly = clrTypeName.split(",")[0].trim();
  const parts = withoutAssembly.split(".");
  return parts[parts.length - 1] || withoutAssembly;
}

/** Splits "A, Asm],[B, Asm" on the top-level "],[" separator between generic arguments. */
function splitGenericArgs(inner: string): string[] {
  const args: string[] = [];
  let depth = 0;
  let current = "";
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === "[") depth++;
    if (ch === "]") depth--;
    if (depth === 0 && ch === "," && inner[i + 1] === "[") {
      args.push(current.replace(/[[\]]/g, ""));
      current = "";
      i++;
      continue;
    }
    current += ch;
  }
  if (current) args.push(current.replace(/[[\]]/g, ""));
  return args;
}

/** A display label for a schema as it appears in a field or type position. */
export function schemaLabel(schema: TypeSchema | undefined, table: Record<string, TypeSchema>): string {
  if (!schema) return "unknown";
  switch (schema.kind) {
    case "Array":
      return `${schemaLabel(resolveSchema(schema.items, table), table)}[]`;
    case "Dictionary":
      return `<string, ${schemaLabel(resolveSchema(schema.additionalProperties, table), table)}>`;
    case "Primitive":
      return schema.primitiveType ?? "unknown";
    default:
      return friendlyTypeName(schema.clrTypeName);
  }
}
