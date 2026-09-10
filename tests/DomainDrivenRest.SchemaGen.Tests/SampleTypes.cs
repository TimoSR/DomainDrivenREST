using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace DomainDrivenRest.SchemaGen.Tests;

public enum Status
{
    Draft,
    Active,
    Archived,
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum Priority
{
    Low,
    Medium,
    High,
}

public sealed class Address
{
    public required string Street { get; set; }
    public string? City { get; set; }
}

public sealed class CreateOrderRequest
{
    [Required]
    public required string CustomerName { get; set; }

    [Range(1, 100)]
    public int Quantity { get; set; }

    [RegularExpression("^[A-Z]{3}$")]
    public string? CurrencyCode { get; set; }

    public Status Status { get; set; }

    public Priority Priority { get; set; }

    public required Address ShippingAddress { get; set; }

    public List<string> Tags { get; set; } = [];

    public Dictionary<string, int> Metadata { get; set; } = [];

    public int? OptionalQuantity { get; set; }
}

public sealed class TreeNode
{
    public required string Name { get; set; }
    public List<TreeNode> Children { get; set; } = [];
}
