using DomainDrivenRest.Features.RequestValidation.Domain;

namespace DomainDrivenRest.Features.RequestValidation.Application;

/// <summary>
/// Checks a candidate request body by deserializing it exactly the way the host will.
/// The abstraction lives here; the System.Text.Json implementation lives in Infrastructure.
/// </summary>
public interface IRequestBodyRoundTripper
{
    RoundTripResult TryDeserialize(Type requestBodyType, string json);
}
