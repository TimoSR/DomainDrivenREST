using DemoApi.Features.Customers.Domain;
using Microsoft.AspNetCore.Mvc;

namespace DemoApi.Features.Customers.Api.Rest;

[ApiController]
[Route("api/customers")]
public sealed class CustomersController : ControllerBase
{
    private static readonly Dictionary<int, Customer> Store = [];
    private static int nextId = 1;

    [HttpGet]
    public ActionResult<IReadOnlyList<Customer>> GetAll() => Ok(Store.Values.OrderBy(c => c.Id).ToList());

    [HttpGet("{id:int}")]
    public ActionResult<Customer> GetById(int id) =>
        Store.TryGetValue(id, out var customer) ? Ok(customer) : NotFound();

    [HttpPost]
    public ActionResult<Customer> Create([FromBody] CreateCustomerRequest request)
    {
        var customer = new Customer
        {
            Id = nextId++,
            DisplayName = request.DisplayName,
            Tier = request.Tier,
            Contact = request.Contact,
            RegisteredAt = DateTimeOffset.UtcNow,
        };

        Store[customer.Id] = customer;
        return CreatedAtAction(nameof(GetById), new { id = customer.Id }, customer);
    }
}
