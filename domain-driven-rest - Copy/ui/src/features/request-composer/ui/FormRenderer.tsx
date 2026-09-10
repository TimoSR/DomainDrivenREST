import { resolveSchema, type PropertySchema, type TypeSchema } from "../../api-schema";
import type { JsonPath } from "../domain/path";
import { defaultValueForSchema } from "../domain/defaultValue";
import { schemaLabel } from "../../api-schema";
import type { ValidationError } from "../domain/validate";
import { Chevron, Close } from "../../../shared/ui/Icons";
import { INLINE_ENUM_LIMIT } from "../../../shared/_critical/uiDefaults";
import { PRIMITIVE } from "../../../shared/_critical/primitiveTypes";

interface FormRendererProps {
  schema: TypeSchema | undefined;
  value: unknown;
  path: JsonPath;
  table: Record<string, TypeSchema>;
  errors: ValidationError[];
  onChange: (path: JsonPath, value: unknown) => void;
}

function samePath(a: JsonPath, b: JsonPath): boolean {
  return a.length === b.length && a.every((segment, i) => segment === b[i]);
}

function errorsAt(errors: ValidationError[], path: JsonPath): ValidationError[] {
  return errors.filter((e) => samePath(e.path, path));
}

/** Renders the body form for an object schema: one labelled field per property. */
export function FormRenderer({ schema, value, path, table, errors, onChange }: FormRendererProps) {
  if (path.length > 8) return <p className="empty-note">Continue editing this nested value in the JSON editor.</p>;
  if (!schema) {
    return <p className="empty-note">This endpoint takes no JSON body.</p>;
  }

  if (schema.kind !== "Object") {
    return (
      <Field
        property={undefined}
        schema={schema}
        value={value}
        path={path}
        table={table}
        errors={errors}
        onChange={onChange}
      />
    );
  }

  return (
    <>
      {(schema.properties ?? []).map((property) => (
        <Field
          key={property.name}
          property={property}
          schema={resolveSchema(property.schema, table)}
          value={(value as Record<string, unknown> | undefined)?.[property.name]}
          path={[...path, property.name]}
          table={table}
          errors={errors}
          onChange={onChange}
        />
      ))}
    </>
  );
}

interface FieldProps {
  property: PropertySchema | undefined;
  schema: TypeSchema | undefined;
  value: unknown;
  path: JsonPath;
  table: Record<string, TypeSchema>;
  errors: ValidationError[];
  onChange: (path: JsonPath, value: unknown) => void;
}

function Field({ property, schema, value, path, table, errors, onChange }: FieldProps) {
  const fieldErrors = errorsAt(errors, path);
  const label = property?.name;
  const typeLabel = schemaLabel(schema, table);

  // Nested objects get their own bordered group rather than a plain labelled row.
  if (schema?.kind === "Object") {
    return (
      <div className="nested">
        <div className="nested-head">
          <Chevron size={11} color="var(--t2)" />
          <span>{label}</span>
          {property?.required && <span className="req">REQ</span>}
          <span className="clr-type">{typeLabel}</span>
        </div>
        <FormRenderer
          schema={schema}
          value={value}
          path={path}
          table={table}
          errors={errors}
          onChange={onChange}
        />
      </div>
    );
  }

  return (
    <div className="field">
      {label && (
        <label className="field-label" htmlFor={`field-${JSON.stringify(path)}`}>
          <span>{label}</span>
          {property?.required && <span className="req">REQ</span>}
          <span className="clr-type">{typeLabel}</span>
        </label>
      )}
      <Control
        schema={schema}
        value={value}
        path={path}
        table={table}
        errors={errors}
        onChange={onChange}
        invalid={fieldErrors.length > 0}
      />
      {fieldErrors.map((error, i) => (
        <span className="field-error" key={i}>
          {error.message}
        </span>
      ))}
    </div>
  );
}

function Control({
  schema,
  value,
  path,
  table,
  errors,
  onChange,
  invalid,
}: Omit<FieldProps, "property"> & { invalid: boolean }) {
  if (!schema) return <span className="empty-note">Unknown type</span>;

  switch (schema.kind) {
    case "Enum":
      return <EnumControl label={path.join(".")} schema={schema} value={value} onChange={(v) => onChange(path, v)} />;

    case "Array": {
      const items = Array.isArray(value) ? (value as unknown[]) : [];
      const itemSchema = resolveSchema(schema.items, table);
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {items.map((item, index) => (
            <div className="array-item" key={index}>
              <span className="idx">{index}</span>
              <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 7, minWidth: 0 }}>
                {itemSchema?.kind === "Object" ? (
                  <FormRenderer
                    schema={itemSchema}
                    value={item}
                    path={[...path, index]}
                    table={table}
                    errors={errors}
                    onChange={onChange}
                  />
                ) : (
                  <Control
                    schema={itemSchema}
                    value={item}
                    path={[...path, index]}
                    table={table}
                    errors={errors}
                    onChange={onChange}
                    invalid={false}
                  />
                )}
              </div>
              <button
                className="icon-x"
                title="Remove item"
                onClick={() => onChange(path, items.filter((_, i) => i !== index))}
              >
                <Close />
              </button>
            </div>
          ))}
          <button
            className="link-btn"
            style={{ marginLeft: 0, alignSelf: "flex-start" }}
            onClick={() => onChange(path, [...items, defaultValueForSchema(itemSchema, table)])}
          >
            + Add item
          </button>
        </div>
      );
    }

    case "Dictionary": {
      const entries = Object.entries((value ?? {}) as Record<string, unknown>);
      const valueSchema = resolveSchema(schema.additionalProperties, table);
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {entries.map(([key, entryValue], index) => (
            <div className="dict-entry" key={index}>
              <input
                className="input-sm key"
                value={key}
                placeholder="key"
                onChange={(e) => {
                  const next: Record<string, unknown> = {};
                  for (const [k, v] of entries) next[k === key ? e.target.value : k] = v;
                  onChange(path, next);
                }}
              />
              <div style={{ flexGrow: 1, minWidth: 0 }}>
                <Control
                  schema={valueSchema}
                  value={entryValue}
                  path={[...path, key]}
                  table={table}
                  errors={errors}
                  onChange={onChange}
                  invalid={false}
                />
              </div>
              <button
                className="icon-x"
                style={{ paddingTop: 0 }}
                title="Remove entry"
                onClick={() => {
                  const next = { ...(value as Record<string, unknown>) };
                  delete next[key];
                  onChange(path, next);
                }}
              >
                <Close />
              </button>
            </div>
          ))}
          <button
            className="link-btn"
            style={{ marginLeft: 0, alignSelf: "flex-start" }}
            onClick={() => onChange(path, { ...(value as Record<string, unknown>), "": defaultValueForSchema(valueSchema, table) })}
          >
            + Add entry
          </button>
        </div>
      );
    }

    case "Primitive":
    default:
      return (
        <PrimitiveInput
          inputId={`field-${JSON.stringify(path)}`}
          label={path.join(".")}
          primitiveType={schema.primitiveType}
          value={value}
          invalid={invalid}
          onChange={(v) => onChange(path, v)}
        />
      );
  }
}

/** Few members read better as a segmented row; many need a select. */


function EnumControl({
  label,
  schema,
  value,
  onChange,
}: {
  label: string;
  schema: TypeSchema;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const members = schema.enumMembers ?? [];
  const wireValue = (member: { name: string; value: unknown }) => (schema.isStringEnum ? member.name : member.value);
  const current = value === undefined || value === null ? "" : String(value);

  if (members.length > 0 && members.length <= INLINE_ENUM_LIMIT) {
    return (
      <div className="enum-row">
        {members.map((member) => {
          const wire = wireValue(member);
          return (
            <button
              key={member.name}
              aria-label={`${label}: ${member.name}`}
              aria-pressed={String(wire) === current}
              className={`enum-opt${String(wire) === current ? " active" : ""}`}
              onClick={() => onChange(wire)}
            >
              {member.name}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <select
      aria-label={label}
      className="input"
      value={current}
      onChange={(e) => {
        const member = members.find((m) => String(wireValue(m)) === e.target.value);
        onChange(member ? wireValue(member) : undefined);
      }}
    >
      <option value="" disabled>
        Select…
      </option>
      {members.map((member) => (
        <option key={member.name} value={String(wireValue(member))}>
          {member.name}
        </option>
      ))}
    </select>
  );
}

function PrimitiveInput({
  inputId,
  label,
  primitiveType,
  value,
  invalid,
  onChange,
}: {
  inputId: string;
  label: string;
  primitiveType?: string | null;
  value: unknown;
  invalid: boolean;
  onChange: (value: unknown) => void;
}) {
  const className = `input${invalid ? " invalid" : ""}`;

  switch (primitiveType) {
    case PRIMITIVE.boolean:
      return (
        <div className="enum-row">
          <button aria-label={`${label}: true`} aria-pressed={value === true} className={`enum-opt${value === true ? " active" : ""}`} onClick={() => onChange(true)}>
            true
          </button>
          <button aria-label={`${label}: false`} aria-pressed={value === false} className={`enum-opt${value === false ? " active" : ""}`} onClick={() => onChange(false)}>
            false
          </button>
        </div>
      );

    case PRIMITIVE.number:
    case PRIMITIVE.integer:
      return (
        <input
          type="number"
          id={inputId}
          aria-label={label}
          aria-invalid={invalid}
          className={className}
          step={primitiveType === "integer" ? 1 : "any"}
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      );

    case PRIMITIVE.dateTime:
      return (
        <input
          type="datetime-local"
          id={inputId}
          aria-label={label}
          aria-invalid={invalid}
          className={className}
          value={typeof value === "string" ? value.slice(0, 16) : ""}
          onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : "")}
        />
      );

    case PRIMITIVE.date:
      return (
        <input
          type="date"
          id={inputId}
          aria-label={label}
          aria-invalid={invalid}
          className={className}
          value={typeof value === "string" ? value.slice(0, 10) : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case PRIMITIVE.json:
      return (
        <textarea
          id={inputId}
          aria-label={label}
          aria-invalid={invalid}
          className={className}
          style={{ minHeight: 64, height: "auto", padding: 10, fontFamily: "var(--mono)", fontSize: "var(--fs-body)" }}
          value={typeof value === "string" ? value : JSON.stringify(value ?? "")}
          placeholder="Raw JSON — this type has a custom converter"
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case PRIMITIVE.guid:
    case PRIMITIVE.string:
    default:
      return (
        <input
          type="text"
          id={inputId}
          aria-label={label}
          aria-invalid={invalid}
          className={className}
          value={typeof value === "string" ? value : value === undefined || value === null ? "" : String(value)}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}
