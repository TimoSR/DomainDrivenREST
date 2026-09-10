using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace DemoApi.Features.Orders.Domain;

public enum OrderStatus
{
    Draft,
    Placed,
    Shipped,
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ShippingSpeed
{
    Standard,
    Express,
    Overnight,
}

public sealed class Address
{
    [Required]
    public required string Street { get; set; }
    public string? City { get; set; }
    [RegularExpression("^[A-Z]{2}$")]
    public string? CountryCode { get; set; }
}

public sealed class OrderLine
{
    [Required]
    public required string Sku { get; set; }
    [Range(1, 999)]
    public int Quantity { get; set; } = 1;
}

public sealed class CreateOrderRequest
{
    [Required]
    public required string CustomerName { get; set; }

    public required OrderStatus Status { get; set; } = OrderStatus.Draft;

    public required ShippingSpeed ShippingSpeed { get; set; } = ShippingSpeed.Standard;

    public required Address ShippingAddress { get; set; }

    // Not `required`: they already default to empty, so forcing every client to send
    // "lines": [] would be ceremony. The form still marks them required — they are
    // non-nullable, so the server will never hand you a null to work with.
    public List<OrderLine> Lines { get; set; } = [];

    public Dictionary<string, string> Metadata { get; set; } = [];
}
