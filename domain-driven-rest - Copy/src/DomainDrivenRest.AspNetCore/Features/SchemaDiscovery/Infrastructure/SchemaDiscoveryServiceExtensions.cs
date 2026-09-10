using DomainDrivenRest.Features.SchemaDiscovery.Application;
using DomainDrivenRest.Shared.Configuration;
using DomainDrivenRest.Shared.Json;
using Microsoft.Extensions.Options;
using Microsoft.AspNetCore.Mvc.ApiExplorer;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace DomainDrivenRest.Features.SchemaDiscovery.Infrastructure;

/// <summary>
/// The SchemaDiscovery slice's single registration point. The host composition root calls
/// this; nothing inside the slice is visible to it.
/// </summary>
public static class SchemaDiscoveryServiceExtensions
{
    public static IServiceCollection AddSchemaDiscoveryFeature(this IServiceCollection services)
    {
        // Mirrors AddSwaggerGen()'s behaviour of requiring/adding ApiExplorer registration.
        services.TryAddSingleton<IApiDescriptionGroupCollectionProvider, ApiDescriptionGroupCollectionProvider>();
        services.AddEndpointsApiExplorer();

        services.TryAddSingleton(sp => new ClrTypeSchemaBuilder(sp.GetRequiredService<AppJsonSerializerOptions>().Value));
        services.TryAddSingleton<IFeatureResolver>(sp =>
            new ConventionFeatureResolver(sp.GetRequiredService<IOptions<DomainDrivenRestOptions>>().Value));
        services.TryAddSingleton<IEndpointCollector, ApiExplorerEndpointCollector>();
        services.TryAddSingleton<ISchemaDiscoveryService, SchemaDiscoveryService>();

        return services;
    }
}
