using DemoApi.Features.Orders.Domain;
using Microsoft.AspNetCore.Mvc;

namespace DemoApi.Features.Orders.Api.Rest;

[ApiController]
[Route("api/orders")]
public sealed class OrdersController : ControllerBase
{
    private static readonly Dictionary<int, Order> Store = [];
    private static int nextId = 1;

    [HttpGet]
    public ActionResult<IReadOnlyList<Order>> GetAll() => Ok(Store.Values.OrderBy(o => o.Id).ToList());

    [HttpGet("{id:int}")]
    public ActionResult<Order> GetById(int id) =>
        Store.TryGetValue(id, out var order) ? Ok(order) : NotFound();

    [HttpPost]
    public ActionResult<Order> Create([FromBody] CreateOrderRequest request)
    {
        var order = ToOrder(nextId++, request);
        Store[order.Id] = order;
        return CreatedAtAction(nameof(GetById), new { id = order.Id }, order);
    }

    [HttpPut("{id:int}")]
    public ActionResult<Order> Update(int id, [FromBody] CreateOrderRequest request)
    {
        if (!Store.TryGetValue(id, out var existing))
        {
            return NotFound();
        }

        // An update replaces the client-supplied fields but keeps when it was first placed.
        var updated = ToOrder(id, request, existing.PlacedAt);
        Store[id] = updated;
        return Ok(updated);
    }

    [HttpDelete("{id:int}")]
    public IActionResult Delete(int id) => Store.Remove(id) ? NoContent() : NotFound();

    private static Order ToOrder(int id, CreateOrderRequest request, DateTimeOffset? placedAt = null) => new()
    {
        Id = id,
        CustomerName = request.CustomerName,
        Status = request.Status,
        ShippingSpeed = request.ShippingSpeed,
        ShippingAddress = request.ShippingAddress,
        Lines = request.Lines,
        Metadata = request.Metadata,
        PlacedAt = placedAt ?? DateTimeOffset.UtcNow,
    };
}
