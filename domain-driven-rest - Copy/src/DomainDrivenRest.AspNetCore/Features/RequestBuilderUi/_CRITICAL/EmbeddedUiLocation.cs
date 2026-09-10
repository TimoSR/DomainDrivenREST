namespace DomainDrivenRest.Features.RequestBuilderUi.Critical;

/// <summary>
/// Where the built SPA lives inside this assembly and how its shell is served.
///
/// High-stability zone: <see cref="BaseNamespace"/> must match the manifest names the
/// csproj's EmbeddedResource glob produces (RootNamespace + folder path as dots). Change
/// one without the other and the UI silently 404s.
/// </summary>
public static class EmbeddedUiLocation
{
    public const string BaseNamespace = "DomainDrivenRest.wwwroot.dist";

    /// <summary>Served for any path under the route prefix that isn't a built asset.</summary>
    public const string ShellFile = "/index.html";

    public const string ShellContentType = "text/html; charset=utf-8";

    /// <summary>Marker the mount-point &lt;base href&gt; is injected after.</summary>
    public const string HeadToken = "<head>";

    /// <summary>Shown when the package was built without the UI having been compiled.</summary>
    public const string MissingShellHtml =
        "<!doctype html><meta charset=\"utf-8\"><title>DomainDrivenRest</title>" +
        "<p style=\"font:14px system-ui;padding:2rem\">The request-builder UI was not embedded in this build. " +
        "Rebuild the package with <code>-p:ForceUiRebuild=true</code>.</p>";
}
