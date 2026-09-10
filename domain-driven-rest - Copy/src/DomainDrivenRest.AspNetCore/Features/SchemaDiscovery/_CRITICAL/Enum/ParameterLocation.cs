namespace DomainDrivenRest.Features.SchemaDiscovery.Critical;

/// <summary>
/// Where a non-body parameter is bound from. High-stability contract: the composer maps
/// these to how it assembles the outgoing request (path substitution, query string, header).
/// </summary>
public enum ParameterLocation
{
    Path,
    Query,
    Header,
}
