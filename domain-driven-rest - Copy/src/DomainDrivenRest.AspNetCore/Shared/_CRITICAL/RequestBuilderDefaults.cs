namespace DomainDrivenRest.Shared.Critical;

/// <summary>
/// System defaults for how the tool mounts itself.
///
/// High-stability zone: <see cref="RoutePrefix"/> is the single mount point the whole UI
/// hangs off. It is safe to change at runtime — the SPA discovers its own base at load time
/// from the injected &lt;base href&gt; rather than having it compiled in.
/// </summary>
public static class RequestBuilderDefaults
{
    public const string RoutePrefix = "request-builder";
}
