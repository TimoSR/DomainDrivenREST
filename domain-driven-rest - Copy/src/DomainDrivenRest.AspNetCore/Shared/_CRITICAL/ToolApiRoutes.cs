namespace DomainDrivenRest.Shared.Critical;

/// <summary>
/// Paths the tool serves for itself, relative to the configured route prefix.
///
/// High-stability zone: the frontend fetches these exact paths, so a change here is a
/// coordinated change with <c>ui/src/shared/_critical/toolApiRoutes.ts</c>. Shared rather
/// than slice-local because <see cref="ApiSegment"/> is a reservation every slice must
/// respect — it is also what the UI pipeline uses to know which paths are NOT the SPA.
/// </summary>
public static class ToolApiRoutes
{
    /// <summary>Segment under the route prefix reserved for the tool's own endpoints.</summary>
    public const string ApiSegment = "/api";

    public const string SchemaDocument = ApiSegment + "/schema.json";

    public const string ValidateBody = ApiSegment + "/validate";

    /// <summary>Query parameter that forces the cached schema document to be recomputed.</summary>
    public const string RefreshQuery = "refresh";
}
