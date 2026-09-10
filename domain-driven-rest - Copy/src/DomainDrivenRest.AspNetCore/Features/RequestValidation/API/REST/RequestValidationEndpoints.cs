using DomainDrivenRest.Features.RequestValidation.Application;
using DomainDrivenRest.Features.RequestValidation.Dto;
using DomainDrivenRest.Features.SchemaDiscovery.Application;
using DomainDrivenRest.Shared.Critical;
using DomainDrivenRest.Shared.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace DomainDrivenRest.Features.RequestValidation.Api.Rest;

/// <summary>
/// Transport layer for the RequestValidation slice. Depends on SchemaDiscovery only through
/// its published <see cref="ISchemaDiscoveryService"/> abstraction, never its internals.
/// </summary>
public static class RequestValidationEndpoints
{
    public static IEndpointRouteBuilder MapRequestValidationFeature(this IEndpointRouteBuilder endpoints)
    {
        endpoints
            .MapPost(ToolApiRoutes.ValidateBody, (
                ValidateBodyRequest request,
                ISchemaDiscoveryService schemas,
                IRequestBodyRoundTripper roundTripper) =>
            {
                if (schemas.FindSchema(request.SchemaId) is null)
                {
                    return Results.NotFound(new { error = $"Unknown schema id '{request.SchemaId}'." });
                }

                var clrType = schemas.ResolveClrType(request.SchemaId);
                if (clrType is null)
                {
                    return Results.Problem($"Could not resolve the CLR type behind schema '{request.SchemaId}'.");
                }

                return Results.Json(roundTripper.TryDeserialize(clrType, request.Json), ToolJsonOptions.Instance);
            })
            .ExcludeFromDescription();

        return endpoints;
    }
}
