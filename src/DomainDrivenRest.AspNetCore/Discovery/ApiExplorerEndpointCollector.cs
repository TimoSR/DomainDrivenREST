using DomainDrivenRest.Abstractions;
using DomainDrivenRest.SchemaGen;
using Microsoft.AspNetCore.Mvc.ApiExplorer;
using Microsoft.AspNetCore.Mvc.Controllers;

namespace DomainDrivenRest.AspNetCore.Discovery;

/// <summary>
/// Discovers endpoints (both MVC controllers and minimal APIs) via ASP.NET Core's own
/// ApiExplorer — the same abstraction Swashbuckle's generator consumes — and builds the
/// full <see cref="ApiDocument"/> served to the frontend.
/// </summary>
internal sealed class ApiExplorerEndpointCollector(
    IApiDescriptionGroupCollectionProvider apiExplorer,
    ClrTypeSchemaBuilder schemaBuilder)
{
    public ApiDocument Collect(DomainDrivenRestOptions options)
    {
        var schemaTable = new Dictionary<string, TypeSchema>();
        var endpoints = new List<EndpointDescriptor>();

        foreach (var group in apiExplorer.ApiDescriptionGroups.Items)
        {
            foreach (var api in group.Items)
            {
                if (ShouldExclude(api, options))
                {
                    continue;
                }

                endpoints.Add(BuildDescriptor(api, group.GroupName, schemaTable));
            }
        }

        return new ApiDocument { Endpoints = endpoints, Schemas = schemaTable };
    }

    private bool ShouldExclude(ApiDescription api, DomainDrivenRestOptions options)
    {
        if (options.ExcludePredicate?.Invoke(api) == true)
        {
            return true;
        }

        var assembly = (api.ActionDescriptor as ControllerActionDescriptor)?.ControllerTypeInfo.Assembly
            ?? api.ActionDescriptor.EndpointMetadata
                .Select(m => m.GetType().Assembly)
                .FirstOrDefault();

        return assembly is not null && options.ExcludeAssemblies.Contains(assembly);
    }

    private EndpointDescriptor BuildDescriptor(ApiDescription api, string? groupName, Dictionary<string, TypeSchema> schemaTable)
    {
        var parameters = api.ParameterDescriptions
            .Where(p => p.Source == Microsoft.AspNetCore.Mvc.ModelBinding.BindingSource.Path
                || p.Source == Microsoft.AspNetCore.Mvc.ModelBinding.BindingSource.Query
                || p.Source == Microsoft.AspNetCore.Mvc.ModelBinding.BindingSource.Header)
            .Select(p => new EndpointParameter
            {
                Name = p.Name,
                Location = MapLocation(p.Source),
                Required = p.IsRequired,
                Schema = schemaBuilder.BuildRef(p.Type ?? typeof(string), schemaTable),
            })
            .ToList();

        var bodyParam = api.ParameterDescriptions
            .FirstOrDefault(p => p.Source == Microsoft.AspNetCore.Mvc.ModelBinding.BindingSource.Body);

        var requestBody = bodyParam?.Type is not null
            ? schemaBuilder.BuildRef(bodyParam.Type, schemaTable)
            : null;

        var responses = api.SupportedResponseTypes.ToDictionary(
            r => r.StatusCode,
            r => r.Type is not null && r.Type != typeof(void)
                ? schemaBuilder.BuildRef(r.Type, schemaTable)
                : null);

        var httpMethod = api.HttpMethod ?? "GET";
        var operationId = $"{httpMethod}_{api.RelativePath}".Replace('/', '_').Replace('{', '_').Replace('}', '_');

        return new EndpointDescriptor
        {
            OperationId = operationId,
            HttpMethod = httpMethod,
            RelativePath = api.RelativePath ?? "",
            GroupName = groupName is { Length: > 0 } ? groupName : InferGroupName(api),
            Parameters = parameters,
            RequestBody = requestBody,
            Responses = responses,
        };
    }

    private static string InferGroupName(ApiDescription api) =>
        (api.ActionDescriptor as ControllerActionDescriptor)?.ControllerName
            ?? api.RelativePath?.Split('/').FirstOrDefault(segment => segment.Length > 0)
            ?? "Default";

    private static ParameterLocation MapLocation(Microsoft.AspNetCore.Mvc.ModelBinding.BindingSource? source)
    {
        if (source == Microsoft.AspNetCore.Mvc.ModelBinding.BindingSource.Path) return ParameterLocation.Path;
        if (source == Microsoft.AspNetCore.Mvc.ModelBinding.BindingSource.Header) return ParameterLocation.Header;
        return ParameterLocation.Query;
    }
}
