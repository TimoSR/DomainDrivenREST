using System.Text.Json;
using System.Text.Json.Serialization;
using DomainDrivenRest.Abstractions;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace DomainDrivenRest.AspNetCore.Api;

internal static class SchemaEndpoint
{
    /// <summary>
    /// Wire format for the tool's OWN diagnostic API (schema.json, validate) — deliberately
    /// separate from the app's business JsonSerializerOptions (which ClrTypeSchemaBuilder
    /// and RequestBodyRoundTripper use for introspection/round-tripping and must never be
    /// altered). The frontend expects string enum names (e.g. SchemaKind) regardless of how
    /// the consuming app happens to configure its own JSON output.
    /// </summary>
    private static readonly JsonSerializerOptions ToolJsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    /// <summary>
    /// Maps /api/schema.json and /api/validate relative to whatever route builder is passed
    /// in — callers nest this inside a branch already scoped to the configured RoutePrefix.
    /// </summary>
    public static void MapDomainDrivenRestApi(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api").ExcludeFromDescription();

        group.MapGet("/schema.json", (ApiDocumentCache cache, bool? refresh) =>
        {
            ApiDocument document = cache.Get(refresh ?? false);
            return Results.Json(document, ToolJsonOptions);
        });

        group.MapPost("/validate", (ValidateRequest request, ApiDocumentCache cache, RequestBodyRoundTripper roundTripper) =>
        {
            var document = cache.Get();
            var schema = document.Schemas.GetValueOrDefault(request.SchemaId);
            if (schema is null)
            {
                return Results.NotFound(new { error = $"Unknown schema id '{request.SchemaId}'." });
            }

            var clrType = System.Type.GetType(schema.ClrTypeName)
                ?? AppDomain.CurrentDomain.GetAssemblies()
                    .Select(a => a.GetType(schema.ClrTypeName))
                    .FirstOrDefault(t => t is not null);

            if (clrType is null)
            {
                return Results.Problem($"Could not resolve CLR type '{schema.ClrTypeName}' for validation.");
            }

            var result = roundTripper.TryDeserialize(clrType, request.Json);
            return Results.Json(result, ToolJsonOptions);
        });
    }

    private sealed record ValidateRequest(string SchemaId, string Json);
}
