import { resolveSchema, type TypeSchema } from "../../api-schema";
import type { JsonPath } from "./path";

export interface ValidationError {
  path: JsonPath;
  message: string;
}

/** Pure function: walks `value` against `schema`, collecting field-level validation errors. Used by both the form (inline errors) and the JSON editor (Monaco diagnostics), so they can never disagree. */
export function validate(
  schema: TypeSchema | undefined,
  value: unknown,
  table: Record<string, TypeSchema>,
  path: JsonPath = [],
): ValidationError[] {
  if (!schema) return [];

  if (value == null) {
    return [];
  }

  const errors: ValidationError[] = [];

  switch (schema.kind) {
    case "Object": {
      for (const prop of schema.properties ?? []) {
        const propValue = (value as Record<string, unknown>)?.[prop.name];
        const propPath = [...path, prop.name];

        if (prop.required && (propValue === undefined || propValue === null || propValue === "")) {
          errors.push({ path: propPath, message: `${prop.name} is required.` });
          continue;
        }

        if (propValue === undefined || propValue === null) continue;

        if (prop.rules) {
          errors.push(...validateRules(prop.rules, propValue, propPath, prop.name));
        }

        const propSchema = resolveSchema(prop.schema, table);
        errors.push(...validate(propSchema, propValue, table, propPath));
      }
      break;
    }
    case "Array": {
      const items = resolveSchema(schema.items, table);
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          errors.push(...validate(items, item, table, [...path, index]));
        });
      }
      break;
    }
    case "Dictionary": {
      const valueSchema = resolveSchema(schema.additionalProperties, table);
      if (typeof value === "object" && value !== null) {
        for (const [key, entryValue] of Object.entries(value)) {
          errors.push(...validate(valueSchema, entryValue, table, [...path, key]));
        }
      }
      break;
    }
    default:
      break;
  }

  return errors;
}

function validateRules(
  rules: NonNullable<TypeSchema["properties"]>[number]["rules"],
  value: unknown,
  path: JsonPath,
  fieldName: string,
): ValidationError[] {
  if (!rules) return [];
  const errors: ValidationError[] = [];

  if (typeof value === "number") {
    if (rules.minimum != null && value < rules.minimum) {
      errors.push({ path, message: `${fieldName} must be >= ${rules.minimum}.` });
    }
    if (rules.maximum != null && value > rules.maximum) {
      errors.push({ path, message: `${fieldName} must be <= ${rules.maximum}.` });
    }
  }

  if (typeof value === "string") {
    if (rules.minLength != null && value.length < rules.minLength) {
      errors.push({ path, message: `${fieldName} must be at least ${rules.minLength} characters.` });
    }
    if (rules.maxLength != null && value.length > rules.maxLength) {
      errors.push({ path, message: `${fieldName} must be at most ${rules.maxLength} characters.` });
    }
    if (rules.pattern) {
      try {
        const re = new RegExp(rules.pattern);
        if (!re.test(value)) {
          errors.push({ path, message: `${fieldName} does not match pattern ${rules.pattern}.` });
        }
      } catch {
        // Invalid regex from the server side — ignore rather than blocking the user.
      }
    }
  }

  return errors;
}
