using System.Net.Http.Json;
using DomainDrivenRest.Features.SchemaDiscovery.Critical;
using DomainDrivenRest.Features.SchemaDiscovery.Dto;
using DomainDrivenRest.Tests.Shared;
using Xunit;

namespace DomainDrivenRest.Features.SchemaDiscovery.Tests.Integration.API;

public class SchemaEndpointTests(DemoApiFactory factory) : IClassFixture<DemoApiFactory>
{
    private Task<ApiDocument?> GetDocumentAsync() =>
        factory.CreateClient().GetFromJsonAsync<ApiDocument>("/request-builder/api/schema.json", DemoApiFactory.ToolJson);

    [Fact]
    public async Task Discovers_orders_controller_endpoints()
    {
        var document = await GetDocumentAsync();

        Assert.NotNull(document);
        Assert.Contains(document!.Endpoints, e => e.HttpMethod == "POST" && e.RelativePath == "api/orders");
        Assert.Contains(document.Endpoints, e => e.HttpMethod == "GET" && e.RelativePath.Contains("api/orders/{id}"));
    }

    [Fact]
    public async Task Includes_nested_and_enum_types_for_create_order_request()
    {
        var document = await GetDocumentAsync();

        var createOrder = document!.Endpoints.Single(e => e.HttpMethod == "POST" && e.RelativePath == "api/orders");
        Assert.NotNull(createOrder.RequestBody);

        var bodySchema = document.Schemas[createOrder.RequestBody!.Ref!];
        Assert.Equal(SchemaKind.Object, bodySchema.Kind);
        Assert.Contains(bodySchema.Properties!, p => p.Name == "shippingAddress");

        var statusSchema = document.Schemas[bodySchema.Properties!.Single(p => p.Name == "status").Schema.Ref!];
        Assert.Equal(SchemaKind.Enum, statusSchema.Kind);
        Assert.False(statusSchema.IsStringEnum);

        var speedSchema = document.Schemas[bodySchema.Properties!.Single(p => p.Name == "shippingSpeed").Schema.Ref!];
        Assert.True(speedSchema.IsStringEnum);
    }

    [Fact]
    public async Task Route_parameters_are_reported_with_their_location()
    {
        var document = await GetDocumentAsync();

        var byId = document!.Endpoints.First(e => e.HttpMethod == "GET" && e.RelativePath.Contains("{id}"));
        var idParam = byId.Parameters.Single(p => p.Name == "id");

        Assert.Equal(ParameterLocation.Path, idParam.Location);
    }

    [Fact]
    public async Task Endpoints_are_attributed_to_their_feature_slice()
    {
        var document = await GetDocumentAsync();

        Assert.All(
            document!.Endpoints.Where(e => e.RelativePath.StartsWith("api/orders")),
            e => Assert.Equal("Orders", e.Feature));

        Assert.All(
            document.Endpoints.Where(e => e.RelativePath.StartsWith("api/customers")),
            e => Assert.Equal("Customers", e.Feature));
    }

    [Fact]
    public async Task Types_inherit_the_feature_of_the_endpoint_that_exposes_them()
    {
        var document = await GetDocumentAsync();

        var features = document!.Schemas.Values
            .Where(s => s.Feature is not null)
            .ToLookup(s => s.Feature!, s => s.ClrTypeName.Split('.').Last());

        Assert.Contains("CreateOrderRequest", features["Orders"]);
        Assert.Contains("Address", features["Orders"]);
        Assert.Contains("CreateCustomerRequest", features["Customers"]);
        Assert.Contains("ContactDetails", features["Customers"]);

        // A slice's own value objects must not leak into another slice.
        Assert.DoesNotContain("Address", features["Customers"]);
        Assert.DoesNotContain("ContactDetails", features["Orders"]);
    }

    [Fact]
    public async Task Tool_endpoints_do_not_discover_themselves()
    {
        var document = await GetDocumentAsync();

        Assert.DoesNotContain(document!.Endpoints, e => e.RelativePath.Contains("schema.json"));
        Assert.DoesNotContain(document.Endpoints, e => e.RelativePath.Contains("validate"));
    }
}
