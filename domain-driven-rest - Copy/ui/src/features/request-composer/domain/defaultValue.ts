import { resolveSchema, type TypeSchema, type TypeSchemaRef } from "../../api-schema";
import { PRIMITIVE } from "../../../shared/_critical/primitiveTypes";

export function defaultValueForRef(ref: TypeSchemaRef | undefined, table: Record<string, TypeSchema>, seen = new Set<string>()): unknown {
  return defaultValueForSchema(resolveSchema(ref, table), table, seen);
}

export function defaultValueForSchema(schema: TypeSchema | undefined, table: Record<string, TypeSchema>, seen = new Set<string>()): unknown {
  if (!schema || seen.has(schema.id)) return null;
  const ancestors = new Set(seen).add(schema.id);

  switch (schema.kind) {
    case "Object": {
      const obj: Record<string, unknown> = {};
      for (const prop of schema.properties ?? []) {
        // A C# property initializer (`= OrderStatus.Draft`) wins: it is what the server
        // would have used, so pre-filling anything else would misrepresent the endpoint.
        if (prop.defaultValue !== undefined && prop.defaultValue !== null) {
          obj[prop.name] = prop.defaultValue;
        } else if (prop.required) {
          obj[prop.name] = defaultValueForRef(prop.schema, table, ancestors);
        }
      }
      return obj;
    }
    case "Array":
      return [];
    case "Dictionary":
      return {};
    case "Enum":
      return schema.enumMembers?.[0]
        ? schema.isStringEnum
          ? schema.enumMembers[0].name
          : schema.enumMembers[0].value
        : null;
    case "Primitive":
      switch (schema.primitiveType) {
        case PRIMITIVE.string:
        case PRIMITIVE.guid:
        case PRIMITIVE.dateTime:
        case PRIMITIVE.date:
        case PRIMITIVE.time:
        case PRIMITIVE.json:
          return "";
        case PRIMITIVE.number:
        case PRIMITIVE.integer:
          return 0;
        case PRIMITIVE.boolean:
          return false;
        default:
          return null;
      }
    default:
      return null;
  }
}
