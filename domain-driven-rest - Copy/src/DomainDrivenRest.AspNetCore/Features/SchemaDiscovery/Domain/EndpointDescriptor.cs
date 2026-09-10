using DomainDrivenRest.Features.SchemaDiscovery.Critical;

namespace DomainDrivenRest.Features.SchemaDiscovery.Domain;

public sealed class EndpointParameter
{
    public required string Name { get; init; }
    public required ParameterLocation Location { get; init; }
    public required bool Required { get; init; }
    public required TypeSchemaRef Schema { get; init; }
}

/// <summary>One discovered operation: how to call it, and the types on either side of it.</summary>
public sealed class EndpointDescriptor
{
    public required string OperationId { get; init; }
    public required string HttpMethod { get; init; }
    public required string RelativePath { get; init; }
    public required string GroupName { get; init; }

    /// <summary>Feature slice this endpoint belongs to — the top-level grouping in the UI.</summary>
    public required string Feature { get; init; }
    public IReadOnlyList<EndpointParameter> Parameters { get; init; } = [];
    public TypeSchemaRef? RequestBody { get; init; }
    public IReadOnlyDictionary<int, TypeSchemaRef?> Responses { get; init; } = new Dictionary<int, TypeSchemaRef?>();
}
