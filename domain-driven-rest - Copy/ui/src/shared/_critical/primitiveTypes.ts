/**
 * The wire vocabulary for `TypeSchema.primitiveType`.
 *
 * High-stability zone, and the least forgiving contract in the system: the server emits
 * these exact strings and the form renderer switches on them to pick a control. A mismatch
 * produces no error anywhere — the field just silently degrades to a plain text box.
 *
 * Must stay in lockstep with
 * `DomainDrivenRest.Features.SchemaDiscovery.Critical.PrimitiveTypeNames`.
 */
export const PRIMITIVE = {
  string: "string",
  integer: "integer",
  number: "number",
  boolean: "boolean",
  guid: "guid",
  dateTime: "date-time",
  date: "date",
  time: "time",
  /** Opaque fallback for a type behind a converter the server could not introspect. */
  json: "json",
} as const;

export type PrimitiveTypeName = (typeof PRIMITIVE)[keyof typeof PRIMITIVE];
