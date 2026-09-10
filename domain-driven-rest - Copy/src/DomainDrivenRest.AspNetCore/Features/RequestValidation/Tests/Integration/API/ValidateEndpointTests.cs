using System.Net;
using System.Net.Http.Json;
using DomainDrivenRest.Features.RequestValidation.Domain;
using DomainDrivenRest.Features.SchemaDiscovery.Dto;
using DomainDrivenRest.Tests.Shared;
using Xunit;

namespace DomainDrivenRest.Features.RequestValidation.Tests.Integration.API;

public class ValidateEndpointTests(DemoApiFactory factory) : IClassFixture<DemoApiFactory>
{
    private async Task<string> CreateOrderSchemaIdAsync()
    {
        var document = await factory.CreateClient()
            .GetFromJsonAsync<ApiDocument>("/request-builder/api/schema.json", DemoApiFactory.ToolJson);
        return document!.Endpoints.Single(e => e.HttpMethod == "POST" && e.RelativePath == "api/orders").RequestBody!.Ref!;
    }

    private async Task<RoundTripResult> ValidateAsync(string schemaId, string json)
    {
        var response = await factory.CreateClient()
            .PostAsJsonAsync("/request-builder/api/validate", new { schemaId, json });
        return (await response.Content.ReadFromJsonAsync<RoundTripResult>(DemoApiFactory.ToolJson))!;
    }

    [Fact]
    public async Task Accepts_a_body_the_real_type_can_deserialize()
    {
        var schemaId = await CreateOrderSchemaIdAsync();
        var json = """{"customerName":"Ada","status":0,"shippingSpeed":"Standard","shippingAddress":{"street":"1 Infinite Loop"}}""";

        var result = await ValidateAsync(schemaId, json);

        Assert.True(result.Success);
    }

    [Fact]
    public async Task Rejects_malformed_json_and_reports_the_serializer_message()
    {
        var schemaId = await CreateOrderSchemaIdAsync();

        var result = await ValidateAsync(schemaId, """{"customerName": 123 not valid json""");

        Assert.False(result.Success);
        Assert.False(string.IsNullOrWhiteSpace(result.ErrorMessage));
    }

    [Fact]
    public async Task Rejects_a_value_the_real_enum_converter_will_not_accept()
    {
        var schemaId = await CreateOrderSchemaIdAsync();
        // shippingSpeed is a string enum in the host app; "Teleport" is not a member.
        var json = """{"customerName":"Ada","status":0,"shippingSpeed":"Teleport","shippingAddress":{"street":"1 Infinite Loop"}}""";

        var result = await ValidateAsync(schemaId, json);

        Assert.False(result.Success);
    }

    [Fact]
    public async Task Unknown_schema_id_is_a_404()
    {
        var response = await factory.CreateClient()
            .PostAsJsonAsync("/request-builder/api/validate", new { schemaId = "Not.A.Real.Type", json = "{}" });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
