using DemoApi.Models;
using Microsoft.AspNetCore.Mvc;

namespace DemoApi.Controllers;

[ApiController]
[Route("api/orders")]
public sealed class OrdersController : ControllerBase
{
    private static readonly List<CreateOrderRequest> Orders = [];

    [HttpGet]
    public ActionResult<IReadOnlyList<CreateOrderRequest>> GetAll() => Ok(Orders);

    [HttpGet("{id:int}")]
    public ActionResult<CreateOrderRequest> GetById(int id)
    {
        if (id < 0 || id >= Orders.Count)
        {
            return NotFound();
        }

        return Ok(Orders[id]);
    }

    [HttpPost]
    public ActionResult<CreateOrderRequest> Create([FromBody] CreateOrderRequest request)
    {
        Orders.Add(request);
        return CreatedAtAction(nameof(GetById), new { id = Orders.Count - 1 }, request);
    }

    [HttpPut("{id:int}")]
    public ActionResult<CreateOrderRequest> Update(int id, [FromBody] CreateOrderRequest request)
    {
        if (id < 0 || id >= Orders.Count)
        {
            return NotFound();
        }

        Orders[id] = request;
        return Ok(request);
    }

    [HttpDelete("{id:int}")]
    public IActionResult Delete(int id)
    {
        if (id < 0 || id >= Orders.Count)
        {
            return NotFound();
        }

        Orders.RemoveAt(id);
        return NoContent();
    }
}
