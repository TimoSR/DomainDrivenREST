using System.Reflection;
using Microsoft.AspNetCore.Mvc.ApiExplorer;

namespace DomainDrivenRest.AspNetCore;

public sealed class DomainDrivenRestOptions
{
    /// <summary>Route segment the UI and API are mounted under, e.g. "/request-builder".</summary>
    public string RoutePrefix { get; set; } = "request-builder";

    /// <summary>
    /// Optional server-side proxy for "Send Request" at {prefix}/api/try-it, useful when the
    /// real API doesn't allow CORS from the tool's own origin. Off by default: the browser
    /// calls the real API directly, and forwarding auth headers through a proxy is a
    /// security-relevant surface that should be opted into deliberately.
    /// </summary>
    public bool EnableTryItProxy { get; set; }

    /// <summary>Assemblies to exclude entirely from endpoint discovery.</summary>
    public HashSet<Assembly> ExcludeAssemblies { get; } = [];

    /// <summary>Additional predicate for excluding individual API descriptions from discovery.</summary>
    public Func<ApiDescription, bool>? ExcludePredicate { get; set; }
}
