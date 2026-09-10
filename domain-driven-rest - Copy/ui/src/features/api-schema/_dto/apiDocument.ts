export type SchemaKind = "Object" | "Array" | "Dictionary" | "Enum" | "Primitive";

export interface TypeSchemaRef {
  ref?: string | null;
  inline?: TypeSchema | null;
}

export interface EnumMember {
  name: string;
  value: unknown;
}

export interface ValidationRules {
  minimum?: number | null;
  maximum?: number | null;
  minLength?: number | null;
  maxLength?: number | null;
  pattern?: string | null;
  allowedValues?: string[] | null;
}

export interface PropertySchema {
  name: string;
  clrPropertyName: string;
  schema: TypeSchemaRef;
  required: boolean;
  defaultValue?: unknown;
  rules?: ValidationRules | null;
  description?: string | null;
  uiHint?: string | null;
}

export interface TypeSchema {
  id: string;
  kind: SchemaKind;
  clrTypeName: string;
  nullable: boolean;
  primitiveType?: string | null;
  properties?: PropertySchema[] | null;
  items?: TypeSchemaRef | null;
  additionalProperties?: TypeSchemaRef | null;
  enumMembers?: EnumMember[] | null;
  isStringEnum: boolean;
  /** Feature slice this type belongs to, when the server could attribute it. */
  feature?: string | null;
}

export type ParameterLocation = "Path" | "Query" | "Header";

export interface EndpointParameter {
  name: string;
  location: ParameterLocation;
  required: boolean;
  schema: TypeSchemaRef;
}

export interface EndpointDescriptor {
  operationId: string;
  httpMethod: string;
  relativePath: string;
  groupName: string;
  /** Feature slice this endpoint belongs to — the top-level grouping. */
  feature: string;
  parameters: EndpointParameter[];
  requestBody?: TypeSchemaRef | null;
  responses: Record<string, TypeSchemaRef | null>;
}

export interface ApiDocument {
  endpoints: EndpointDescriptor[];
  schemas: Record<string, TypeSchema>;
}

