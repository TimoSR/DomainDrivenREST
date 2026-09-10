# DomainDrivenRest

A Swagger-UI-inspired request builder for ASP.NET Core, focused on *building and sending
requests* — especially POST/PUT bodies — with a generated form (enum dropdowns, typed
inputs, nested objects) that stays in two-way sync with a raw JSON view. Integrates into an
existing ASP.NET Core project as easily as `Swashbuckle.AspNetCore`: a package reference
plus two lines in `Program.cs`.

## Why

Swagger UI documents your API; it doesn't help you *build* a valid, nontrivial POST body by
hand, and it only ever shows you routes. DomainDrivenRest does two things differently:

**It composes requests, not docs.** A three-column cockpit — generated form, live JSON, and
the response — all visible at once. No accordions, no modal "Try it out". Enums become
pickers, nested objects become nested groups, lists are repeatable, and DataAnnotations
rules surface as inline validation. One click fills the whole body with plausible sample
data that satisfies the schema's own constraints, including regex patterns.

**It's domain-centric, not route-centric.** Swagger can tell you what `POST /api/orders`
takes. It can't answer *"show me the `Order` type and every route that touches it."* The
Domain tab does: each type's shape, the endpoints that read or write it, and a graph of what
it pulls in — all derived from the same schema, no extra annotation required.

Underneath both: the JSON it builds is exactly what your endpoint will accept, because
validation and sending round-trip through the app's own real `JsonSerializerOptions` rather
than a shadow implementation.

Also included, and also absent from Swagger UI: a ⌘K command palette over every endpoint,
type and past request; request history; light and dark themes; and one-click export of the
composed request as cURL, C# `HttpClient`, TypeScript `fetch`, or a `.http` file.

## How it works

- **Discovery**: endpoints (MVC controllers and minimal APIs) are discovered via ASP.NET
  Core's own `IApiDescriptionGroupCollectionProvider` — the same mechanism Swashbuckle uses.
- **Schema generation**: CLR types are walked via System.Text.Json's own `JsonTypeInfo`
  contract model (not hand-rolled reflection), so the generated form always matches how your
  types actually (de)serialize — naming policy, `[JsonIgnore]`, `[JsonStringEnumConverter]`,
  DataAnnotations rules, and all.
- **Never drifts**: when you hit "Validate against type" or "Send Request", the JSON is
  deserialized through the exact `JsonSerializerOptions` your app registered for MVC/minimal
  API model binding — not a reimplementation. If it round-trips, it's valid for the real
  endpoint.
- **Domain view**: entities, their kind (aggregate / value object / enum) and the
  read-vs-write endpoint index are derived client-side from the same schema document — no
  extra server work and nothing for you to annotate.
- **UI**: a React + TypeScript SPA (Vite, Monaco, zustand, TanStack Query) is built and
  embedded as manifest resources into the `DomainDrivenRest.AspNetCore` package, served by
  the middleware at a configurable route — no separate deploy step, no Node required on
  consumers' machines.

The visual design (tokens, screens, and one alternate direction) is drafted as a design
canvas; `design/` holds the source artboards.

## Project layout

```
src/
  DomainDrivenRest.Abstractions/   # schema DTOs (TypeSchema, EndpointDescriptor, ApiDocument) — no ASP.NET Core dependency
  DomainDrivenRest.SchemaGen/      # ClrTypeSchemaBuilder: CLR Type -> TypeSchema, unit-testable in isolation
  DomainDrivenRest.AspNetCore/     # the NuGet package: endpoint discovery, middleware, embedded UI
  DomainDrivenRest.SystemTextJson/ # optional SchemaHint attribute for UI-only rendering hints
ui/                                 # React + TS SPA, built and embedded into DomainDrivenRest.AspNetCore
samples/DemoApi/                    # a small ASP.NET Core Web API exercising the middleware end-to-end
tests/
  DomainDrivenRest.SchemaGen.Tests/    # unit tests for the schema builder
  DomainDrivenRest.AspNetCore.Tests/   # WebApplicationFactory integration tests
```

## Getting started

### Prerequisites

- .NET 10 SDK
- Node.js (only needed to build the UI — see below)

### Run the sample API

```bash
dotnet run --project samples/DemoApi
```

Then open `http://localhost:<port>/request-builder/` in a browser. The sample exposes a
`POST /api/orders` endpoint with nested objects, a list, a dictionary, and both a numeric and
a `[JsonStringEnumConverter]`-based enum, to exercise the schema builder end-to-end.

### Run the tests

```bash
dotnet test DomainDrivenRest.slnx
```

### Build the UI

The UI is built automatically the first time you build `DomainDrivenRest.AspNetCore` (an
MSBuild target runs `npm ci && npm run build` in `ui/` and embeds the output). To iterate on
the UI directly with hot reload:

```bash
cd ui
npm install
npm run dev
```

To force a rebuild of the embedded UI after changing it (the MSBuild target otherwise skips
the build once `wwwroot/dist` exists):

```bash
dotnet build src/DomainDrivenRest.AspNetCore -p:ForceUiRebuild=true
```

## Using it in your own project

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddDomainDrivenRest(options =>
{
    options.RoutePrefix = "request-builder";   // default
    options.EnableTryItProxy = false;          // default: browser calls your API directly
    // options.ExcludeAssemblies.Add(typeof(SomeInternalDto).Assembly);
});

var app = builder.Build();
app.MapControllers();

if (app.Environment.IsDevelopment())
{
    app.UseDomainDrivenRest();   // mounts the UI + schema API at /request-builder
}

app.Run();
```

No manual schema registration is required for a typical Web API — endpoints and their
request/response DTOs are discovered automatically.

## Status

Working today: endpoint discovery, schema generation (objects, lists, dictionaries, enums,
nullable types, DataAnnotations rules, recursive types), the generated form with two-way
JSON sync, live server-side type validation, sample-data fill, sending real requests,
the domain explorer with type graph, the ⌘K palette, request history, code export, and
light/dark themes.

Not yet built: a server-side "try it" proxy for CORS-constrained setups, XML-doc-comment
descriptions, saved/shared request collections, file uploads, OAuth "Authorize" flows, and
OpenAPI schema export.
