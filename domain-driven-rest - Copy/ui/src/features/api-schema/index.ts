/**
 * Public surface of the api-schema slice. Other slices import from here only — never from
 * a subfolder — so the slice's internals stay free to move.
 */
export type {
  ApiDocument,
  EndpointDescriptor,
  EndpointParameter,
  EnumMember,
  ParameterLocation,
  PropertySchema,
  SchemaKind,
  TypeSchema,
  TypeSchemaRef,
  ValidationRules,
} from "./_dto/apiDocument";

export { friendlyTypeName, resolveSchema, schemaLabel, unwrapToNamed } from "./domain/schema";
export { fetchApiDocument } from "./infrastructure/schemaClient";
