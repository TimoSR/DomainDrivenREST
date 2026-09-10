using System.Collections.Concurrent;
using System.Reflection;
using DomainDrivenRest.Annotations;
using DomainDrivenRest.Features.SchemaDiscovery.Application;
using DomainDrivenRest.Shared.Configuration;

namespace DomainDrivenRest.Features.SchemaDiscovery.Infrastructure;

/// <summary>
/// Reads the feature slice out of a type, in priority order:
///
///   1. an explicit [Feature("…")]
///   2. the host's own <see cref="DomainDrivenRestOptions.FeatureResolver"/> delegate
///   3. the namespace convention — the segment after "Features", or any segment ending
///      in "Feature" (so both <c>App.Features.Orders.Domain</c> and
///      <c>App.OrdersFeature.Domain</c> resolve to "Orders")
///
/// No match returns null, leaving the type to be attributed by the endpoint that uses it.
/// </summary>
internal sealed class ConventionFeatureResolver(DomainDrivenRestOptions options) : IFeatureResolver
{
    private const string FeaturesSegment = "Features";
    private const string FeatureSuffix = "Feature";

    private readonly ConcurrentDictionary<Type, string?> cache = new();

    public string? Resolve(Type type) => cache.GetOrAdd(type, ResolveUncached);

    private string? ResolveUncached(Type type)
    {
        if (type.GetCustomAttribute<FeatureAttribute>() is { Name.Length: > 0 } attribute)
        {
            return attribute.Name;
        }

        if (options.FeatureResolver?.Invoke(type) is { Length: > 0 } fromHost)
        {
            return fromHost;
        }

        return FromNamespace(type.Namespace);
    }

    private static string? FromNamespace(string? ns)
    {
        if (string.IsNullOrEmpty(ns))
        {
            return null;
        }

        var segments = ns.Split('.');

        for (var i = 0; i < segments.Length; i++)
        {
            if (segments[i].Equals(FeaturesSegment, StringComparison.OrdinalIgnoreCase) && i + 1 < segments.Length)
            {
                return Trim(segments[i + 1]);
            }
        }

        var suffixed = segments.FirstOrDefault(s =>
            s.Length > FeatureSuffix.Length && s.EndsWith(FeatureSuffix, StringComparison.OrdinalIgnoreCase));

        return suffixed is null ? null : Trim(suffixed);
    }

    /// <summary>"OrdersFeature" reads better in the UI as "Orders".</summary>
    private static string Trim(string segment) =>
        segment.Length > FeatureSuffix.Length && segment.EndsWith(FeatureSuffix, StringComparison.OrdinalIgnoreCase)
            ? segment[..^FeatureSuffix.Length]
            : segment;
}
