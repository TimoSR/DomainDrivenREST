using System.Threading;
using DomainDrivenRest.Abstractions;
using DomainDrivenRest.AspNetCore.Discovery;
using Microsoft.Extensions.Options;

namespace DomainDrivenRest.AspNetCore.Api;

/// <summary>
/// Computes the ApiDocument once (ApiExplorer's descriptions are stable for the app's
/// lifetime) and caches it; a `?refresh=true` query parameter on the schema endpoint can
/// force recomputation for dev-mode hot-reload scenarios.
/// </summary>
internal sealed class ApiDocumentCache(
    ApiExplorerEndpointCollector collector, IOptions<DomainDrivenRestOptions> options)
{
    private ApiDocument? cached;
    private readonly Lock gate = new();

    public ApiDocument Get(bool forceRefresh = false)
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

            cached = collector.Collect(options.Value);
            return cached;
        }
    }
}
