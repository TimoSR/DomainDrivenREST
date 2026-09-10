namespace DomainDrivenRest.Features.SchemaDiscovery.Application;

/// <summary>
/// Decides which feature slice a CLR type belongs to. Returning null means "no opinion" —
/// the collector then attributes the type from whatever endpoint exposes it, so a codebase
/// that isn't organised into feature folders still groups sensibly.
/// </summary>
public interface IFeatureResolver
{
    string? Resolve(Type type);
}
