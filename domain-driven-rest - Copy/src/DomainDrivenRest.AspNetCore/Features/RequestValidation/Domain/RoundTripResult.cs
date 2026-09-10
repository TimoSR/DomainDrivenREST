namespace DomainDrivenRest.Features.RequestValidation.Domain;

/// <summary>
/// The outcome of checking a candidate request body against its CLR type. Failure carries
/// the serializer's own JSON path and message rather than a reworded one, so the user sees
/// exactly what the real endpoint would have complained about.
/// </summary>
public sealed record RoundTripResult(bool Success, string? ErrorPath, string? ErrorMessage)
{
    public static RoundTripResult Ok() => new(true, null, null);

    public static RoundTripResult Fail(string? path, string message) => new(false, path, message);
}
