using DomainDrivenRest.Features.RequestBuilderUi.Infrastructure;
using DomainDrivenRest.Features.RequestValidation.Infrastructure;
using DomainDrivenRest.Features.SchemaDiscovery.Infrastructure;
using DomainDrivenRest.Shared.Configuration;
using DomainDrivenRest.Shared.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace DomainDrivenRest.AspNetCore;

/// <summary>
/// Composition root. Adds shared services, then hands off to each feature slice's own
/// registration extension — this file never sees a slice's internal types.
/// </summary>
public static class DomainDrivenRestServiceCollectionExtensions
{
    public static IServiceCollection AddDomainDrivenRest(
        this IServiceCollection services, Action<DomainDrivenRestOptions>? configure = null)
    {
        if (configure is not null)
        {
            services.Configure(configure);
        }
        else
        {
            services.AddOptions<DomainDrivenRestOptions>();
        }

        services.TryAddSingleton(AppJsonSerializerOptions.Resolve);

        services.AddSchemaDiscoveryFeature();
        services.AddRequestValidationFeature();
        services.AddRequestBuilderUiFeature();

        return services;
    }
}
