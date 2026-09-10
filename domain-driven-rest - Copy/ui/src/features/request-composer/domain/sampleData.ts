import { resolveSchema, type TypeSchema, type TypeSchemaRef, type ValidationRules } from "../../api-schema";
import { PRIMITIVE } from "../../../shared/_critical/primitiveTypes";
import { SAMPLE_DATA_MAX_DEPTH } from "../../../shared/_critical/uiDefaults";

/**
 * Generates a plausible request body from the schema — enough to send a real request
 * without hand-typing every required field. Values respect the schema's own rules
 * (ranges, patterns, enum members) and take a hint from the property's name.
 */
export function sampleForRef(ref: TypeSchemaRef | undefined | null, table: Record<string, TypeSchema>): unknown {
  return sampleForSchema(resolveSchema(ref, table), table, "", 0);
}

function sampleForSchema(
  schema: TypeSchema | undefined,
  table: Record<string, TypeSchema>,
  fieldName: string,
  depth: number,
  rules?: ValidationRules | null,
): unknown {
  if (!schema || depth > SAMPLE_DATA_MAX_DEPTH) return null;

  switch (schema.kind) {
    case "Object": {
      const obj: Record<string, unknown> = {};
      for (const property of schema.properties ?? []) {
        obj[property.name] = sampleForSchema(
          resolveSchema(property.schema, table),
          table,
          property.name,
          depth + 1,
          property.rules,
        );
      }
      return obj;
    }
    case "Array": {
      const item = resolveSchema(schema.items, table);
      return [sampleForSchema(item, table, fieldName, depth + 1)];
    }
    case "Dictionary": {
      const value = resolveSchema(schema.additionalProperties, table);
      return { key: sampleForSchema(value, table, "key", depth + 1) };
    }
    case "Enum": {
      const member = schema.enumMembers?.[0];
      if (!member) return null;
      return schema.isStringEnum ? member.name : member.value;
    }
    case "Primitive":
      return samplePrimitive(schema.primitiveType, fieldName, rules);
    default:
      return null;
  }
}

const NAME_HINTS: { match: RegExp; value: string }[] = [
  { match: /email/i, value: "ada@example.com" },
  { match: /(^|[^a-z])url|uri($|[^a-z])/i, value: "https://example.com" },
  { match: /phone|tel/i, value: "+1 555 0100" },
  { match: /(first ?name|given)/i, value: "Ada" },
  { match: /(last ?name|surname|family)/i, value: "Lovelace" },
  { match: /name/i, value: "Ada Lovelace" },
  { match: /street|address(?:line)?1?/i, value: "1 Compiler Ave" },
  { match: /city|town/i, value: "Arlington" },
  { match: /country/i, value: "US" },
  { match: /(post|zip).?code/i, value: "22201" },
  { match: /currency/i, value: "USD" },
  { match: /sku|code|ref/i, value: "ABC-1" },
  { match: /description|note|comment|message/i, value: "Sample text" },
  { match: /title|label|subject/i, value: "Sample title" },
];

function samplePrimitive(primitiveType: string | null | undefined, fieldName: string, rules?: ValidationRules | null): unknown {
  switch (primitiveType) {
    case PRIMITIVE.boolean:
      return true;
    case PRIMITIVE.integer: {
      const min = rules?.minimum ?? 1;
      const max = rules?.maximum ?? min + 9;
      return Math.round(Math.min(Math.max(min, 1), max));
    }
    case PRIMITIVE.number: {
      const min = rules?.minimum ?? 1;
      const max = rules?.maximum ?? min + 9;
      return Math.min(Math.max(min, 1), max);
    }
    case PRIMITIVE.guid:
      return "00000000-0000-0000-0000-000000000000";
    case PRIMITIVE.dateTime:
      return new Date().toISOString();
    case PRIMITIVE.date:
      return new Date().toISOString().slice(0, 10);
    case PRIMITIVE.time:
      return "12:00:00";
    case PRIMITIVE.json:
      return "";
    case PRIMITIVE.string:
    default:
      return sampleString(fieldName, rules);
  }
}

function sampleString(fieldName: string, rules?: ValidationRules | null): string {
  if (rules?.allowedValues?.length) return rules.allowedValues[0];

  // A pattern is a hard constraint — a hint that fails it is worse than nothing.
  if (rules?.pattern) {
    const fromPattern = sampleFromSimplePattern(rules.pattern);
    if (fromPattern !== null) return fromPattern;
  }

  const hint = NAME_HINTS.find((h) => h.match.test(fieldName));
  let value = hint ? hint.value : "sample";

  if (rules?.maxLength != null && value.length > rules.maxLength) {
    value = value.slice(0, rules.maxLength);
  }
  if (rules?.minLength != null && value.length < rules.minLength) {
    value = value.padEnd(rules.minLength, "x");
  }
  return value;
}

/**
 * Handles the narrow but common case of a character-class pattern like ^[A-Z]{2}$,
 * which is most of what DataAnnotations regexes look like in practice. Anything more
 * elaborate returns null so the caller falls back to a name hint.
 */
function sampleFromSimplePattern(pattern: string): string | null {
  const match = pattern.match(/^\^?\[([A-Za-z0-9-]+)\]\{(\d+)(?:,\d+)?\}\$?$/);
  if (!match) return null;

  const [, charClass, countText] = match;
  const count = Number(countText);
  if (!Number.isFinite(count) || count < 1 || count > 64) return null;

  const first = expandFirstChar(charClass);
  return first === null ? null : first.repeat(count);
}

function expandFirstChar(charClass: string): string | null {
  const range = charClass.match(/^([A-Za-z0-9])-([A-Za-z0-9])/);
  if (range) return range[1];
  const literal = charClass.match(/[A-Za-z0-9]/);
  return literal ? literal[0] : null;
}
