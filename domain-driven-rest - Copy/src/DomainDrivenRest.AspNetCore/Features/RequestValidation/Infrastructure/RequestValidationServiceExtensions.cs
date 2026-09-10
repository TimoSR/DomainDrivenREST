using DomainDrivenRest.Features.RequestValidation.Application;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace DomainDrivenRest.Features.RequestValidation.Infrastructure;

/// <summary>The RequestValidation slice's single registration point.</summary>
public static class RequestValidationServiceExtensions
{
    public static IServiceCollection AddRequestValidationFeature(this IServiceCollection services)
    {
        services.TryAddSingleton<IRequestBodyRoundTripper, SystemTextJsonRoundTripper>();
        return services;
    }
}
