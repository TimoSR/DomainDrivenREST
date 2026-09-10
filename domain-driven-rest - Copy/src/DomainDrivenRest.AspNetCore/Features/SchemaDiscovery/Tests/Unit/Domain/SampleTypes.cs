using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace DomainDrivenRest.Features.SchemaDiscovery.Tests.Unit.Domain;

/// <summary>Fixtures for the schema builder — deliberately local to this slice's tests.</summary>
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

/// <summary>Exercises C# property initializers, which carry no metadata of their own.</summary>
public sealed class DefaultsShape
{
    public int Quantity { get; set; } = 1;
    public string Label { get; set; } = "pending";
    public Status Status { get; set; } = Status.Archived;
    public Priority Priority { get; set; } = Priority.High;
    public int Untouched { get; set; }
    public Address? Nested { get; set; } = new() { Street = "1 Compiler Ave" };
}

/// <summary>A read-model shape: read-only collections, as response DTOs commonly use.</summary>
public sealed class ReadOnlyShape
{
    public required IReadOnlyDictionary<string, int> Metadata { get; init; }
    public required IReadOnlyList<string> Tags { get; init; }
}
