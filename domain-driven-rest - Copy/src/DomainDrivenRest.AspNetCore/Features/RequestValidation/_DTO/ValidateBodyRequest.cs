namespace DomainDrivenRest.Features.RequestValidation.Dto;

/// <summary>Request contract for POST {prefix}/api/validate. Pure data carrier.</summary>
public sealed record ValidateBodyRequest(string SchemaId, string Json);
