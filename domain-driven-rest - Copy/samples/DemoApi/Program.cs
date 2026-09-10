using DomainDrivenRest.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

builder.Services.AddDomainDrivenRest(options =>
{
    options.RoutePrefix = "request-builder";
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseAuthorization();

app.MapControllers();

if (app.Environment.IsDevelopment())
{
    app.UseDomainDrivenRest();
}

app.Run();

public partial class Program;
