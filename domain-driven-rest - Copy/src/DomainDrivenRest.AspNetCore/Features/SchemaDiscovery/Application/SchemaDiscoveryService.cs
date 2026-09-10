using System.Collections.Concurrent;
using System.Threading;
using DomainDrivenRest.Features.SchemaDiscovery.Domain;
using DomainDrivenRest.Features.SchemaDiscovery.Dto;
using DomainDrivenRest.Shared.Configuration;
using Microsoft.Extensions.Options;

namespace DomainDrivenRest.Features.SchemaDiscovery.Application;

/// <summary>
/// Computes the ApiDocument once (ApiExplorer's descriptions are stable for the app's
/// lifetime) and caches it; callers can force a recompute for dev-mode hot-reload.
/// </summary>
internal sealed class SchemaDiscoveryService(
    IEndpointCollector collector,
    IOptions<DomainDrivenRestOptions> options) : ISchemaDiscoveryService
{
    private readonly Lock gate = new();
    private readonly ConcurrentDictionary<string, Type?> clrTypeCache = new();
    private ApiDocument? cached;

    public ApiDocument GetDocument(bool forceRefresh = false)
    {
        if (!forceRefresh && cached is not null)
        {
            return cached;
        }

        lock (gate)
        {
            if (!forceRefresh && cached is not null)
            {
                return cached;
            }

            var schemaTable = new Dictionary<string, TypeSchema>();
            var endpoints = collector.Collect(options.Value, schemaTable);
            cached = new ApiDocument { Endpoints = endpoints, Schemas = schemaTable };
            clrTypeCache.Clear();
            return cached;
        }
    }

    public TypeSchema? FindSchema(string schemaId) => GetDocument().Schemas.GetValueOrDefault(schemaId);

    public Type? ResolveClrType(string schemaId) =>
        clrTypeCache.GetOrAdd(schemaId, id =>
        {
            var schema = FindSchema(id);
            if (schema is null)
            {
                return null;
            }

            return Type.GetType(schema.ClrTypeName)
                ?? AppDomain.CurrentDomain.GetAssemblies()
                    .Select(assembly => assembly.GetType(schema.ClrTypeName))
                    .FirstOrDefault(type => type is not null);
        });
}
