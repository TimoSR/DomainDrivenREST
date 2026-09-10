namespace DemoApi.Features.Orders.Domain;

/// <summary>
/// The read model for an order — what the API hands back. Deliberately distinct from
/// <see cref="CreateOrderRequest"/>: it carries server-assigned state (the identifier the
/// {id} routes address, and when the order was placed) that a client never supplies.
/// </summary>
public sealed class Order
{
    public required int Id { get; init; }

    public required string CustomerName { get; init; }

    public OrderStatus Status { get; init; }

    public ShippingSpeed ShippingSpeed { get; init; }

    public required Address ShippingAddress { get; init; }

    public IReadOnlyList<OrderLine> Lines { get; init; } = [];

    public IReadOnlyDictionary<string, string> Metadata { get; init; } = new Dictionary<string, string>();

    public required DateTimeOffset PlacedAt { get; init; }
}
