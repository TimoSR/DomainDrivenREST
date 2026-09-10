namespace DomainDrivenRest.Abstractions;

public enum ParameterLocation
{
    Path,
    Query,
    Header,
}

public sealed class EndpointParameter
{
    public required string Name { get; init; }
    public required ParameterLocation Location { get; init; }
    public required bool Required { get; init; }
    public required TypeSchemaRef Schema { get; init; }
}

public sealed class EndpointDescriptor
{
    public required string OperationId { get; init; }
    public required string HttpMethod { get; init; }
    public required string RelativePath { get; init; }
    public required string GroupName { get; init; }
    public IReadOnlyList<EndpointParameter> Parameters { get; init; } = [];
    public TypeSchemaRef? RequestBody { get; init; }
    public IReadOnlyDictionary<int, TypeSchemaRef?> Responses { get; init; } = new Dictionary<int, TypeSchemaRef?>();
}

/// <summary>
/// The full payload served from GET {prefix}/api/schema.json: every discovered endpoint,
/// plus a flat, deduplicated table of every TypeSchema referenced (directly or via $ref)
/// from any endpoint above.
/// </summary>
public sealed class ApiDocument
{
    public required IReadOnlyList<EndpointDescriptor> Endpoints { get; init; }
    public required IReadOnlyDictionary<string, TypeSchema> Schemas { get; init; }
}
