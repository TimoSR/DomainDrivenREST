using System.Text.Json;

namespace DomainDrivenRest.AspNetCore.Api;

public sealed record RoundTripResult(bool Success, string? ErrorPath, string? ErrorMessage)
{
    public static RoundTripResult Ok() => new(true, null, null);
    public static RoundTripResult Fail(string? path, string message) => new(false, path, message);
}

/// <summary>
/// Validates that JSON produced by the form/editor round-trips through the app's own,
/// real JsonSerializerOptions — the same ones MVC/minimal-API model binding use. This is
/// the concrete mechanism that keeps "JSON state" and "data object" provably in sync: the
/// tool never reimplements deserialization or validation logic of its own.
/// </summary>
public sealed class RequestBodyRoundTripper(JsonSerializerOptions jsonOptions)
{
    public RoundTripResult TryDeserialize(Type requestBodyType, string json)
    {
        try
        {
            JsonSerializer.Deserialize(json, requestBodyType, jsonOptions);
            return RoundTripResult.Ok();
        }
        catch (JsonException ex)
        {
            return RoundTripResult.Fail(ex.Path, ex.Message);
        }
    }
}
