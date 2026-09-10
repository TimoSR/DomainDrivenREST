using DomainDrivenRest.Features.SchemaDiscovery.Domain;
using DomainDrivenRest.Features.SchemaDiscovery.Dto;

namespace DomainDrivenRest.Features.SchemaDiscovery.Application;

/// <summary>
/// The feature's use case: produce the document describing every discoverable endpoint and
/// the types on either side of it. Other slices depend on this interface, never on the
/// implementation or on ApiExplorer.
/// </summary>
public interface ISchemaDiscoveryService
{
    ApiDocument GetDocument(bool forceRefresh = false);

    /// <summary>Resolves a schema id back to the CLR type it was generated from, or null when it can no longer be located.</summary>
    Type? ResolveClrType(string schemaId);

    TypeSchema? FindSchema(string schemaId);
}
