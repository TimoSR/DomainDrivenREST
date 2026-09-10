namespace DomainDrivenRest.SystemTextJson;

public enum SchemaFieldKind
{
    SingleLineText,
    MultilineText,
    Password,
}

/// <summary>
/// Optional UI-only rendering hint for a property, orthogonal to wire-format serialization.
/// Discovered via reflection by the schema builder; never affects how the property is
/// actually (de)serialized.
/// </summary>
[AttributeUsage(AttributeTargets.Property)]
public sealed class SchemaHintAttribute(SchemaFieldKind kind) : Attribute
{
    public SchemaFieldKind Kind { get; } = kind;
}
