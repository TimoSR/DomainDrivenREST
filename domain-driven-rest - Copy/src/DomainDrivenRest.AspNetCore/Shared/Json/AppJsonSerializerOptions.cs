using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace DomainDrivenRest.Shared.Json;

/// <summary>
/// The actual <see cref="JsonSerializerOptions"/> the host will use to (de)serialize request
/// bodies at runtime — MVC's if registered, otherwise minimal APIs' (ASP.NET Core exposes two
/// distinct options types depending on which pipeline owns an endpoint).
///
/// Shared deliberately: SchemaDiscovery reads it to describe types, RequestValidation uses it
/// to round-trip them. Both reading the same instance is what keeps the generated form from
/// ever drifting from real serialization behaviour.
/// </summary>
public sealed class AppJsonSerializerOptions(JsonSerializerOptions value)
{
    public JsonSerializerOptions Value { get; } = value;

    internal static AppJsonSerializerOptions Resolve(IServiceProvider services)
    {
        var mvc = services.GetService<IOptions<Microsoft.AspNetCore.Mvc.JsonOptions>>();
        if (mvc is not null)
        {
            return new AppJsonSerializerOptions(mvc.Value.JsonSerializerOptions);
        }

        var http = services.GetService<IOptions<Microsoft.AspNetCore.Http.Json.JsonOptions>>();
        return new AppJsonSerializerOptions(http?.Value.SerializerOptions ?? new JsonSerializerOptions(JsonSerializerDefaults.Web));
    }
}
