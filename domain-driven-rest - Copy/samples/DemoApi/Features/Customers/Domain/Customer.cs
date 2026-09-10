using System.ComponentModel.DataAnnotations;

namespace DemoApi.Features.Customers.Domain;

public enum CustomerTier
{
    Standard,
    Premium,
}

/// <summary>A Customers-owned value object — deliberately distinct from the Orders slice's own Address.</summary>
public sealed class ContactDetails
{
    [Required]
    public required string Email { get; set; }

    [RegularExpression(@"^\+?[0-9 ]{7,15}$")]
    public string? Phone { get; set; }
}

public sealed class CreateCustomerRequest
{
    [Required]
    [StringLength(80, MinimumLength = 2)]
    public required string DisplayName { get; set; }

    public required CustomerTier Tier { get; set; } = CustomerTier.Standard;

    public required ContactDetails Contact { get; set; }
}

/// <summary>The read model for a customer.</summary>
public sealed class Customer
{
    public required int Id { get; init; }
    public required string DisplayName { get; init; }
    public CustomerTier Tier { get; init; }
    public required ContactDetails Contact { get; init; }
    public required DateTimeOffset RegisteredAt { get; init; }
}
