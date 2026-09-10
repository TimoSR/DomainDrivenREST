using DomainDrivenRest.Features.RequestBuilderUi.Critical;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.FileProviders;

namespace DomainDrivenRest.Features.RequestBuilderUi.Infrastructure;

/// <summary>Resolves the built SPA out of this assembly's embedded resources.</summary>
public sealed class EmbeddedUiFileProvider(IFileProvider inner)
{
    public IFileProvider Files { get; } = inner;

    public static EmbeddedUiFileProvider Create() =>
        new(new EmbeddedFileProvider(typeof(EmbeddedUiFileProvider).Assembly, EmbeddedUiLocation.BaseNamespace));
}

/// <summary>The RequestBuilderUi slice's single registration point.</summary>
public static class RequestBuilderUiServiceExtensions
{
    public static IServiceCollection AddRequestBuilderUiFeature(this IServiceCollection services)
    {
        services.TryAddSingleton(_ => EmbeddedUiFileProvider.Create());
        return services;
    }
}
