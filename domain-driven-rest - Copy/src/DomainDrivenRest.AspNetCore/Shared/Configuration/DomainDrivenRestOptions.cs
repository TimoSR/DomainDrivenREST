using System.Reflection;
using DomainDrivenRest.Shared.Critical;
using Microsoft.AspNetCore.Mvc.ApiExplorer;

namespace DomainDrivenRest.Shared.Configuration;

public sealed class DomainDrivenRestOptions
{
    /// <summary>Route segment the UI and API are mounted under, e.g. "/request-builder".</summary>
    public string RoutePrefix { get; set; } = RequestBuilderDefaults.RoutePrefix;

    /// <summary>Assemblies to exclude entirely from endpoint discovery.</summary>
    public HashSet<Assembly> ExcludeAssemblies { get; } = [];

    /// <summary>Additional predicate for excluding individual API descriptions from discovery.</summary>
    public Func<ApiDescription, bool>? ExcludePredicate { get; set; }

    /// <summary>
    /// Escape hatch for naming the feature slice a type belongs to, when neither
    /// [Feature] nor the namespace convention fits. Return null to defer to the convention.
    /// </summary>
    public Func<Type, string?>? FeatureResolver { get; set; }
}
