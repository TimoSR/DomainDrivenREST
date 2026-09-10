using System.Net;
using System.Text.RegularExpressions;
using DomainDrivenRest.Shared.Configuration;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace DomainDrivenRest.Features.RequestBuilderUi.Tests.Integration.API;

/// <summary>
/// RoutePrefix used to be a lie: the SPA's asset URLs were baked in at build time, so any
/// prefix other than the default served a blank page. These tests pin the fix — the shell
/// is stamped with a &lt;base href&gt; at request time and the assets are relative.
/// </summary>
public sealed class CustomPrefixFactory : WebApplicationFactory<Program>
{
    public const string Prefix = "api-tools";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureServices(services =>
            services.Configure<DomainDrivenRestOptions>(options => options.RoutePrefix = Prefix));
    }
}

public class CustomRoutePrefixTests(CustomPrefixFactory factory) : IClassFixture<CustomPrefixFactory>
{
    [Fact]
    public async Task Serves_the_ui_at_the_configured_prefix()
    {
        var response = await factory.CreateClient().GetAsync($"/{CustomPrefixFactory.Prefix}/");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("text/html", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task Shell_declares_the_configured_mount_point()
    {
        var html = await factory.CreateClient().GetStringAsync($"/{CustomPrefixFactory.Prefix}/");

        Assert.Contains($"<base href=\"/{CustomPrefixFactory.Prefix}/\">", html);
        Assert.DoesNotContain("/request-builder/", html);
    }

    [Fact]
    public async Task Assets_referenced_by_the_shell_actually_resolve()
    {
        var client = factory.CreateClient();
        var html = await client.GetStringAsync($"/{CustomPrefixFactory.Prefix}/");

        var scriptSrc = Regex.Match(html, """<script[^>]+src="([^"]+)""").Groups[1].Value;
        Assert.False(string.IsNullOrWhiteSpace(scriptSrc), "shell referenced no script");

        // Resolve the (relative) src against the shell's base, exactly as a browser would.
        var resolved = new Uri(new Uri($"http://localhost/{CustomPrefixFactory.Prefix}/"), scriptSrc);

        var asset = await client.GetAsync(resolved.PathAndQuery);
        Assert.Equal(HttpStatusCode.OK, asset.StatusCode);
    }

    [Fact]
    public async Task Tool_api_moves_with_the_prefix()
    {
        var client = factory.CreateClient();

        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync($"/{CustomPrefixFactory.Prefix}/api/schema.json")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/request-builder/api/schema.json")).StatusCode);
    }

    [Fact]
    public async Task Entity_ids_containing_dots_are_treated_as_routes_not_assets()
    {
        // "/domain/DemoApi.Models.CreateOrderRequest" looks like it has a file extension.
        var response = await factory.CreateClient()
            .GetAsync($"/{CustomPrefixFactory.Prefix}/domain/DemoApi.Models.CreateOrderRequest");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("text/html", response.Content.Headers.ContentType?.MediaType);
    }
}
