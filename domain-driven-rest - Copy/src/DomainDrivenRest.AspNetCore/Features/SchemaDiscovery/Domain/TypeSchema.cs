using DomainDrivenRest.Features.SchemaDiscovery.Critical;

namespace DomainDrivenRest.Features.SchemaDiscovery.Domain;

/// <summary>
/// A form-drivable description of a CLR type's JSON shape, as it will actually be
/// (de)serialized by the app's own <see cref="System.Text.Json.JsonSerializerOptions"/>.
/// Property names deliberately alias JSON Schema keywords so a subset-compatible
/// exporter can be added later without reshaping this model.
/// </summary>
public sealed class TypeSchema
{
    /// <summary>Stable key (CLR full type name) used for $ref-style deduplication of recursive/shared types.</summary>
    public required string Id { get; init; }

    public required SchemaKind Kind { get; init; }

    public required string ClrTypeName { get; init; }

    public bool Nullable { get; init; }

    /// <summary>"string" | "number" | "integer" | "boolean" | "date-time" | "date" | "guid" | "json" (opaque fallback). Set when Kind == Primitive.</summary>
    public string? PrimitiveType { get; init; }

    /// <summary>Set when Kind == Object.</summary>
    public IReadOnlyList<PropertySchema>? Properties { get; init; }

    /// <summary>Set when Kind == Array.</summary>
    public TypeSchemaRef? Items { get; init; }

    /// <summary>Set when Kind == Dictionary (keys are assumed string).</summary>
    public TypeSchemaRef? AdditionalProperties { get; init; }

    /// <summary>Set when Kind == Enum.</summary>
    public IReadOnlyList<EnumMember>? EnumMembers { get; init; }

    /// <summary>True when the enum is serialized as its member name (e.g. via [JsonStringEnumConverter]) rather than its numeric value.</summary>
    public bool IsStringEnum { get; init; }

    /// <summary>
    /// Feature slice this type belongs to. Resolved from the type itself where the
    /// codebase says so, otherwise inherited from the endpoint that exposes it.
    /// </summary>
    public string? Feature { get; set; }
}

/// <summary>
/// A reference to a TypeSchema: either the schema is inlined directly, or (for recursive/
/// already-visited types) only an Id is given and the resolver must look it up in the
/// document's flat schema table.
/// </summary>
public sealed class TypeSchemaRef
{
    public string? Ref { get; init; }
    public TypeSchema? Inline { get; init; }
}

public sealed class PropertySchema
{
    /// <summary>JSON property name after the app's configured JsonNamingPolicy has been applied.</summary>
    public required string Name { get; init; }

    public required string ClrPropertyName { get; init; }

    public required TypeSchemaRef Schema { get; init; }

    public bool Required { get; init; }

    public object? DefaultValue { get; init; }

    public ValidationRules? Rules { get; init; }

    public string? Description { get; init; }

    /// <summary>Optional UI rendering hint from [SchemaHint], e.g. "MultilineText".</summary>
    public string? UiHint { get; init; }
}

public sealed class ValidationRules
{
    public double? Minimum { get; init; }
    public double? Maximum { get; init; }
    public int? MinLength { get; init; }
    public int? MaxLength { get; init; }
    public string? Pattern { get; init; }
    public string[]? AllowedValues { get; init; }
}

public sealed class EnumMember
{
    public required string Name { get; init; }
    public required object Value { get; init; }
}
