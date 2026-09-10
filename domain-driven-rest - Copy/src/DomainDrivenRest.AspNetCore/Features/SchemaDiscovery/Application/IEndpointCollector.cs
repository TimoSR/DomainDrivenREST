using DomainDrivenRest.Features.SchemaDiscovery.Domain;
using DomainDrivenRest.Shared.Configuration;

namespace DomainDrivenRest.Features.SchemaDiscovery.Application;

/// <summary>
/// Enumerates the host's endpoints. Defined here so the use case depends on an abstraction;
/// the ApiExplorer-backed implementation lives in Infrastructure.
/// </summary>
public interface IEndpointCollector
{
    IReadOnlyList<EndpointDescriptor> Collect(DomainDrivenRestOptions options, IDictionary<string, TypeSchema> schemaTable);
}
