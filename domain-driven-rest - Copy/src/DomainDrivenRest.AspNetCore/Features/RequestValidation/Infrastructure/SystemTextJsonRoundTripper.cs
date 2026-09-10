using System.Text.Json;
using DomainDrivenRest.Features.RequestValidation.Application;
using DomainDrivenRest.Features.RequestValidation.Domain;
using DomainDrivenRest.Shared.Json;

namespace DomainDrivenRest.Features.RequestValidation.Infrastructure;

/// <summary>
/// Validates by round-tripping through the app's own, real
/// <see cref="JsonSerializerOptions"/> — the same ones MVC/minimal-API model binding use.
/// This is the concrete mechanism that keeps "JSON state" and "data object" provably in
/// sync: the tool never reimplements deserialization or validation logic of its own.
/// </summary>
internal sealed class SystemTextJsonRoundTripper(AppJsonSerializerOptions jsonOptions) : IRequestBodyRoundTripper
{
    public RoundTripResult TryDeserialize(Type requestBodyType, string json)
    {
        try
        {
            JsonSerializer.Deserialize(json, requestBodyType, jsonOptions.Value);
            return RoundTripResult.Ok();
        }
        catch (JsonException ex)
        {
            return RoundTripResult.Fail(ex.Path, ex.Message);
        }
    }
}
