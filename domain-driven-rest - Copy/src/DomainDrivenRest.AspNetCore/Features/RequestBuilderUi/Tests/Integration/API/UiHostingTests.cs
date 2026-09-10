using System.Net;
using DomainDrivenRest.Tests.Shared;
using Xunit;

namespace DomainDrivenRest.Features.RequestBuilderUi.Tests.Integration.API;

public class UiHostingTests(DemoApiFactory factory) : IClassFixture<DemoApiFactory>
{
    [Fact]
    public async Task Shell_javascript_is_embedded_and_served_as_javascript()
    {
        var client = factory.CreateClient();
        var html = await client.GetStringAsync("/request-builder/");
        var script = System.Text.RegularExpressions.Regex.Match(html, "src=\"\\./(assets/[^\"]+\\.js)\"");
        Assert.True(script.Success, "The shell must reference its built JavaScript entry point.");
        var response = await client.GetAsync("/request-builder/" + script.Groups[1].Value);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("javascript", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task Missing_assets_return_404_instead_of_html()
    {
        var response = await factory.CreateClient().GetAsync("/request-builder/assets/missing-chunk.js");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Serves_the_embedded_spa_at_the_route_prefix()
    {
        var response = await factory.CreateClient().GetAsync("/request-builder/");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("text/html", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task Client_routed_paths_fall_back_to_the_spa_shell()
    {
        var response = await factory.CreateClient().GetAsync("/request-builder/endpoints/POST_api_orders");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("text/html", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task Api_paths_are_not_swallowed_by_the_spa_fallback()
    {
        var response = await factory.CreateClient().GetAsync("/request-builder/api/schema.json");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("json", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task The_host_apps_own_routes_are_untouched()
    {
        var response = await factory.CreateClient().GetAsync("/api/orders");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
