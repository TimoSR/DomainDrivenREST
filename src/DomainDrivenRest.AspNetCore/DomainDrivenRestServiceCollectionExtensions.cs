using System.Text.Json;
using DomainDrivenRest.AspNetCore.Api;
using DomainDrivenRest.AspNetCore.Discovery;
using DomainDrivenRest.SchemaGen;
using Microsoft.AspNetCore.Mvc.ApiExplorer;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;

namespace DomainDrivenRest.AspNetCore;

public static class DomainDrivenRestServiceCollectionExtensions
{
    public static IServiceCollection AddDomainDrivenRest(
        this IServiceCollection services, Action<DomainDrivenRestOptions>? configure = null)
    {
        // Mirrors AddSwaggerGen()'s behavior of requiring/adding ApiExplorer registration.
        services.TryAddSingleton<IApiDescriptionGroupCollectionProvider, ApiDescriptionGroupCollectionProvider>();
        services.AddEndpointsApiExplorer();

        if (configure is not null)
        {
            services.Configure(configure);
        }
        else
        {
            services.AddOptions<DomainDrivenRestOptions>();
        }

        services.TryAddSingleton(ResolveJsonSerializerOptions);
        services.TryAddSingleton(sp => new ClrTypeSchemaBuilder(sp.GetRequiredService<JsonSerializerOptions>()));
        services.TryAddSingleton<ApiExplorerEndpointCollector>();
        services.TryAddSingleton<ApiDocumentCache>();
        services.TryAddSingleton(sp => new RequestBodyRoundTripper(sp.GetRequiredService<JsonSerializerOptions>()));

        return services;
    }

    /// <summary>
    /// Resolves the actual JsonSerializerOptions the app will use to (de)serialize request
    /// bodies at runtime, preferring MVC's JsonOptions and falling back to minimal APIs'
    /// Http.Json JsonOptions — ASP.NET Core exposes two distinct options types depending on
    /// which pipeline owns a given endpoint. This is what keeps the generated schema from
    /// ever drifting from real (de)serialization behavior.
    /// </summary>
    private static JsonSerializerOptions ResolveJsonSerializerOptions(IServiceProvider sp)
    {
        var mvcJsonOptions = sp.GetService<IOptions<Microsoft.AspNetCore.Mvc.JsonOptions>>();
        if (mvcJsonOptions is not null)
        {
            return mvcJsonOptions.Value.JsonSerializerOptions;
        }

        var httpJsonOptions = sp.GetService<IOptions<Microsoft.AspNetCore.Http.Json.JsonOptions>>();
        return httpJsonOptions?.Value.SerializerOptions ?? new JsonSerializerOptions(JsonSerializerDefaults.Web);
    }
}
