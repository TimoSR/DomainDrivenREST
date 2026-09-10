using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace DomainDrivenRest.Tests.Shared;

/// <summary>
/// Hosts the sample API for integration tests. Cross-slice test infrastructure, so it lives
/// in the test project rather than inside any one feature.
/// </summary>
public sealed class DemoApiFactory : WebApplicationFactory<Program>
{
    /// <summary>
    /// Mirrors the tool's own wire format: its diagnostic endpoints always emit string enum
    /// names, independent of how the hosting app configures JSON.
    /// </summary>
    public static readonly JsonSerializerOptions ToolJson = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    protected override void ConfigureWebHost(IWebHostBuilder builder) => builder.UseEnvironment("Development");
}
