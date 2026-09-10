using DomainDrivenRest.Features.SchemaDiscovery.Application;
using DomainDrivenRest.Shared.Critical;
using DomainDrivenRest.Shared.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace DomainDrivenRest.Features.SchemaDiscovery.Api.Rest;

/// <summary>
/// Transport layer for the SchemaDiscovery slice. Translates the HTTP request into a call
/// on <see cref="ISchemaDiscoveryService"/> and nothing more — no discovery or schema logic.
/// </summary>
public static class SchemaDiscoveryEndpoints
{
    public static IEndpointRouteBuilder MapSchemaDiscoveryFeature(this IEndpointRouteBuilder endpoints)
    {
        endpoints
            .MapGet(ToolApiRoutes.SchemaDocument, (ISchemaDiscoveryService schemas, bool? refresh) =>
                Results.Json(schemas.GetDocument(refresh ?? false), ToolJsonOptions.Instance))
            .ExcludeFromDescription();

        return endpoints;
    }
}
