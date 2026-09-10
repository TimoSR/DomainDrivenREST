using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using DomainDrivenRest.Abstractions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace DomainDrivenRest.AspNetCore.Tests;

public class SchemaEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> factory;

    // Mirrors SchemaEndpoint's ToolJsonOptions: the tool's own diagnostic API always emits
    // string enum names, independent of the sample app's business JsonSerializerOptions.
    private static readonly JsonSerializerOptions ClientJsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    public SchemaEndpointTests(WebApplicationFactory<Program> factory)
    {
        this.factory = factory.WithWebHostBuilder(builder => builder.UseEnvironment("Development"));
    }

    [Fact]
    public async Task Schema_endpoint_discovers_orders_controller_endpoints()
    {
        var client = factory.CreateClient();

        var document = await client.GetFromJsonAsync<ApiDocument>("/request-builder/api/schema.json", ClientJsonOptions);

        Assert.NotNull(document);
        Assert.Contains(document!.Endpoints, e => e.HttpMethod == "POST" && e.RelativePath == "api/orders");
        Assert.Contains(document.Endpoints, e => e.HttpMethod == "GET" && e.RelativePath.Contains("api/orders/{id}"));
    }

    [Fact]
    public async Task Schema_endpoint_includes_nested_and_enum_types_for_create_order_request()
    {
        var client = factory.CreateClient();

        var document = await client.GetFromJsonAsync<ApiDocument>("/request-builder/api/schema.json", ClientJsonOptions);

        var createOrder = document!.Endpoints.Single(e => e.HttpMethod == "POST" && e.RelativePath == "api/orders");
        Assert.NotNull(createOrder.RequestBody);

        var bodySchema = document.Schemas[createOrder.RequestBody!.Ref!];
        Assert.Equal(SchemaKind.Object, bodySchema.Kind);
        Assert.Contains(bodySchema.Properties!, p => p.Name == "shippingAddress");

        var statusProp = bodySchema.Properties!.Single(p => p.Name == "status");
        var statusSchema = document.Schemas[statusProp.Schema.Ref!];
        Assert.Equal(SchemaKind.Enum, statusSchema.Kind);
        Assert.False(statusSchema.IsStringEnum);

        var shippingSpeedProp = bodySchema.Properties!.Single(p => p.Name == "shippingSpeed");
        var shippingSpeedSchema = document.Schemas[shippingSpeedProp.Schema.Ref!];
        Assert.True(shippingSpeedSchema.IsStringEnum);
    }

    [Fact]
    public async Task Validate_endpoint_accepts_valid_body_and_rejects_invalid_json()
    {
        var client = factory.CreateClient();
        var document = await client.GetFromJsonAsync<ApiDocument>("/request-builder/api/schema.json", ClientJsonOptions);
        var createOrder = document!.Endpoints.Single(e => e.HttpMethod == "POST" && e.RelativePath == "api/orders");
        var schemaId = createOrder.RequestBody!.Ref!;

        var validJson = """{"customerName":"Ada","status":0,"shippingSpeed":"Standard","shippingAddress":{"street":"1 Infinite Loop"}}""";
        var validResponse = await client.PostAsJsonAsync("/request-builder/api/validate", new { schemaId, json = validJson });
        var validResult = await validResponse.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(validResult.GetProperty("success").GetBoolean());

        var invalidJson = """{"customerName": 123 not valid json""";
        var invalidResponse = await client.PostAsJsonAsync("/request-builder/api/validate", new { schemaId, json = invalidJson });
        var invalidResult = await invalidResponse.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(invalidResult.GetProperty("success").GetBoolean());
    }
}
