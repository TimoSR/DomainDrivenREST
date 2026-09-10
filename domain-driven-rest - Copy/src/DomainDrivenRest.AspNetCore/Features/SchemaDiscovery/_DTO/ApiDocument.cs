using DomainDrivenRest.Features.SchemaDiscovery.Domain;

namespace DomainDrivenRest.Features.SchemaDiscovery.Dto;

/// <summary>
/// Response contract for GET {prefix}/api/schema.json: every discovered endpoint, plus a
/// flat, deduplicated table of every TypeSchema referenced (directly or via $ref) from any
/// endpoint above. Pure data carrier — no behaviour.
/// </summary>
public sealed class ApiDocument
{
    public required IReadOnlyList<EndpointDescriptor> Endpoints { get; init; }
    public required IReadOnlyDictionary<string, TypeSchema> Schemas { get; init; }
}
