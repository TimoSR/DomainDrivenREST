namespace DomainDrivenRest.Features.SchemaDiscovery.Critical;

/// <summary>
/// The shape a CLR type takes on the wire. High-stability contract: the frontend switches
/// on these names to choose a form control, so adding or renaming a member is a breaking
/// change for every published UI build.
/// </summary>
public enum SchemaKind
{
    Object,
    Array,
    Dictionary,
    Enum,
    Primitive,
}
