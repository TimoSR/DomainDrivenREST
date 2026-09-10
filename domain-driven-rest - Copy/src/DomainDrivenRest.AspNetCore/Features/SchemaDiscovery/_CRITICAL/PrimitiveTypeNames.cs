namespace DomainDrivenRest.Features.SchemaDiscovery.Critical;

/// <summary>
/// The wire vocabulary for <see cref="Domain.TypeSchema.PrimitiveType"/>.
///
/// High-stability zone, and the least forgiving contract in the system: the frontend
/// switches on these exact strings to pick a form control. Rename one and the backend keeps
/// emitting happily while the UI silently falls through to a plain text box — no error
/// anywhere. Any change here must be made in lockstep with
/// <c>ui/src/shared/_critical/primitiveTypes.ts</c>.
/// </summary>
public static class PrimitiveTypeNames
{
    public const string String = "string";
    public const string Integer = "integer";
    public const string Number = "number";
    public const string Boolean = "boolean";
    public const string Guid = "guid";
    public const string DateTime = "date-time";
    public const string Date = "date";
    public const string Time = "time";

    /// <summary>
    /// Opaque fallback for a type sitting behind a custom converter we can't introspect.
    /// The UI renders a raw JSON textarea rather than guessing at a structure.
    /// </summary>
    public const string Json = "json";
}
