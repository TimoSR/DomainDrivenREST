using DomainDrivenRest.Features.SchemaDiscovery.Application;
using DomainDrivenRest.Features.SchemaDiscovery.Critical;
using DomainDrivenRest.Features.SchemaDiscovery.Domain;
using DomainDrivenRest.Shared.Configuration;
using System.Reflection;
using Microsoft.AspNetCore.Mvc.ApiExplorer;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace DomainDrivenRest.Features.SchemaDiscovery.Infrastructure;

/// <summary>
/// Adapter over ASP.NET Core's own ApiExplorer — the same abstraction Swashbuckle's
/// generator consumes — so both MVC controllers and minimal APIs are discovered uniformly.
/// </summary>
internal sealed class ApiExplorerEndpointCollector(
    IApiDescriptionGroupCollectionProvider apiExplorer,
    ClrTypeSchemaBuilder schemaBuilder,
    IFeatureResolver featureResolver) : IEndpointCollector
{
    public IReadOnlyList<EndpointDescriptor> Collect(
        DomainDrivenRestOptions options, IDictionary<string, TypeSchema> schemaTable)
    {
        var table = schemaTable as Dictionary<string, TypeSchema> ?? new Dictionary<string, TypeSchema>(schemaTable);
        var endpoints = new List<EndpointDescriptor>();

        foreach (var group in apiExplorer.ApiDescriptionGroups.Items)
        {
            foreach (var api in group.Items)
            {
                if (ShouldExclude(api, options))
                {
                    continue;
                }

                endpoints.Add(BuildDescriptor(api, group.GroupName, table));
            }
        }

        AttributeTypesToFeatures(endpoints, table);

        if (!ReferenceEquals(table, schemaTable))
        {
            foreach (var pair in table)
            {
                schemaTable[pair.Key] = pair.Value;
            }
        }

        return endpoints;
    }

    /// <summary>
    /// A type that doesn't declare its own feature inherits it from the endpoint that
    /// exposes it, so an API with no feature folders still groups usefully. Types reached
    /// from several features keep the first — the domain view nests them under each
    /// aggregate that references them anyway.
    /// </summary>
    private void AttributeTypesToFeatures(IReadOnlyList<EndpointDescriptor> endpoints, Dictionary<string, TypeSchema> table)
    {
        foreach (var endpoint in endpoints)
        {
            foreach (var rootRef in RootRefsOf(endpoint))
            {
                Propagate(rootRef, endpoint.Feature, table, []);
            }
        }
    }

    private static IEnumerable<TypeSchemaRef?> RootRefsOf(EndpointDescriptor endpoint) =>
        endpoint.Responses.Values
            .Append(endpoint.RequestBody)
            .Concat(endpoint.Parameters.Select(p => (TypeSchemaRef?)p.Schema));

    private static void Propagate(
        TypeSchemaRef? reference, string feature, Dictionary<string, TypeSchema> table, HashSet<string> visited)
    {
        if (reference?.Ref is not { } id || !visited.Add(id) || !table.TryGetValue(id, out var schema))
        {
            return;
        }

        schema.Feature ??= feature;

        foreach (var property in schema.Properties ?? [])
        {
            Propagate(property.Schema, feature, table, visited);
        }

        Propagate(schema.Items, feature, table, visited);
        Propagate(schema.AdditionalProperties, feature, table, visited);
    }

    private static bool ShouldExclude(ApiDescription api, DomainDrivenRestOptions options)
    {
        if (options.ExcludePredicate?.Invoke(api) == true)
        {
            return true;
        }

        var assembly = (api.ActionDescriptor as ControllerActionDescriptor)?.ControllerTypeInfo.Assembly
            ?? api.ActionDescriptor.EndpointMetadata.Select(m => m.GetType().Assembly).FirstOrDefault();

        return assembly is not null && options.ExcludeAssemblies.Contains(assembly);
    }

    private EndpointDescriptor BuildDescriptor(
        ApiDescription api, string? groupName, Dictionary<string, TypeSchema> schemaTable)
    {
        var parameters = api.ParameterDescriptions
            .Where(p => p.Source == BindingSource.Path || p.Source == BindingSource.Query || p.Source == BindingSource.Header)
            .Select(p => new EndpointParameter
            {
                Name = p.Name,
                Location = MapLocation(p.Source),
                Required = p.IsRequired,
                Schema = schemaBuilder.BuildRef(p.Type ?? typeof(string), schemaTable),
            })
            .ToList();

        var bodyParam = api.ParameterDescriptions.FirstOrDefault(p => p.Source == BindingSource.Body);
        var requestBody = bodyParam?.Type is not null ? schemaBuilder.BuildRef(bodyParam.Type, schemaTable) : null;

        var responses = api.SupportedResponseTypes.ToDictionary(
            r => r.StatusCode,
            r => r.Type is not null && r.Type != typeof(void) ? schemaBuilder.BuildRef(r.Type, schemaTable) : null);

        var httpMethod = api.HttpMethod ?? "GET";
        var operationId = $"{httpMethod}_{api.RelativePath}".Replace('/', '_').Replace('{', '_').Replace('}', '_');

        var resolvedGroup = groupName is { Length: > 0 } ? groupName : InferGroupName(api);

        return new EndpointDescriptor
        {
            OperationId = operationId,
            HttpMethod = httpMethod,
            RelativePath = api.RelativePath ?? "",
            GroupName = resolvedGroup,
            Feature = ResolveFeature(api, resolvedGroup),
            Parameters = parameters,
            RequestBody = requestBody,
            Responses = responses,
        };
    }

    /// <summary>
    /// The feature the endpoint's own code lives in. Falls back to the ApiExplorer group
    /// (the controller name) so an API that isn't sliced into features still gets one
    /// bucket per controller rather than everything in a single pile.
    /// </summary>
    private string ResolveFeature(ApiDescription api, string groupName)
    {
        var declaringType = (api.ActionDescriptor as ControllerActionDescriptor)?.ControllerTypeInfo.AsType()
            ?? api.ActionDescriptor.EndpointMetadata.OfType<MethodInfo>().FirstOrDefault()?.DeclaringType;

        return (declaringType is not null ? featureResolver.Resolve(declaringType) : null) ?? groupName;
    }

    private static string InferGroupName(ApiDescription api) =>
        (api.ActionDescriptor as ControllerActionDescriptor)?.ControllerName
            ?? api.RelativePath?.Split('/').FirstOrDefault(segment => segment.Length > 0)
            ?? "Default";

    private static ParameterLocation MapLocation(BindingSource? source)
    {
        if (source == BindingSource.Path) return ParameterLocation.Path;
        if (source == BindingSource.Header) return ParameterLocation.Header;
        return ParameterLocation.Query;
    }
}
