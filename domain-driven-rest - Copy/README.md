# DomainDrivenRest

A Swagger-UI-inspired request builder for ASP.NET Core, focused on *building and sending
requests* — especially POST/PUT bodies — with a generated form (enum dropdowns, typed
inputs, nested objects) that stays in two-way sync with a raw JSON view. Integrates into an
existing ASP.NET Core project as easily as `Swashbuckle.AspNetCore`: a package reference
plus two lines in `Program.cs`.

## Why

Swagger UI documents your API; it doesn't help you *build* a valid, nontrivial POST body by
hand, and it only ever shows you routes. DomainDrivenRest does two things differently:

**It composes requests, not docs.** A cockpit — generated form on the left, live JSON
stacked over the response it produced on the right — all visible at once. No accordions,
no modal "Try it out". Enums become
pickers, nested objects become nested groups, lists are repeatable, and DataAnnotations
rules surface as inline validation. One click fills the whole body with plausible sample
data that satisfies the schema's own constraints, including regex patterns.

**It's domain-centric, not route-centric.** Swagger can tell you what `POST /api/orders`
takes. It can't answer *"show me the `Order` type and every route that touches it."* The
Domain tab does: each type's shape, the endpoints that read or write it, and a graph of what
it pulls in — all derived from the same schema, no extra annotation required.

**It's organised by feature slice, not by controller.** Both Routes and Domain group by the
feature the code lives in. Within a feature, each aggregate is a root that owns its own
dependency subtree, so one aggregate's types never bleed into another's:

```
Orders                          Customers
  CreateOrderRequest              CreateCustomerRequest
    └ OrderStatus                   └ CustomerTier
    └ ShippingSpeed                 └ ContactDetails
    └ Address                     Customer
    └ OrderLine                     └ CustomerTier
  Order                             └ ContactDetails
    └ …
```

A type genuinely shared by two aggregates appears under both — that's the honest answer.
Traversal stops at another aggregate rather than absorbing it, so roots stay distinct.

The feature is resolved per type, in priority order: an explicit `[Feature("…")]`, then
your own `options.FeatureResolver` delegate, then the namespace convention — the segment
after `Features`, or any segment ending in `Feature` (so both `App.Features.Orders.Domain`
and `App.OrdersFeature.Domain` give "Orders"). If none match, a type inherits the feature of
the endpoint exposing it and endpoints fall back to their controller name, so an API with no
feature folders still groups one bucket per controller.

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

## Architecture

The codebase is organised in **vertical slices by capability**, with Clean/Onion layering
*inside* each slice — never layers at the top level. Both the backend and the frontend
follow the same shape.

### Backend

```
src/DomainDrivenRest.AspNetCore/
  Features/
    SchemaDiscovery/            # discover endpoints, describe their CLR types
      _CRITICAL/Enum/           #   SchemaKind, ParameterLocation — high-stability wire contracts
      _DTO/                     #   ApiDocument (response contract)
      Domain/                   #   TypeSchema, EndpointDescriptor — framework-agnostic
      Application/              #   ClrTypeSchemaBuilder, ISchemaDiscoveryService, IEndpointCollector
      Infrastructure/           #   ApiExplorer adapter + SchemaDiscoveryServiceExtensions
      API/REST/                 #   GET /api/schema.json
      Tests/{Unit,Integration}/ #   compiled by the test project, excluded from the package
    RequestValidation/          # round-trip a body through the host's own serializer
    RequestBuilderUi/           # serve the embedded SPA
  Shared/                       # cross-slice only: options, JSON option resolution
  DomainDrivenRest*Extensions.cs  # composition root — calls each slice's Add*/Map* entry point
src/DomainDrivenRest.Annotations/ # dependency-free [SchemaHint] for consumers' own DTOs
ui/                               # React SPA (same slicing — see below)
samples/DemoApi/                  # sample API exercising the middleware end-to-end
tests/DomainDrivenRest.Tests/     # test host + shared fixtures
```

Dependency flow inside a slice is `API → Application → Domain`, with `Infrastructure`
implementing `Application`'s interfaces. `Domain` references nothing outward. Slices talk to
each other only through published abstractions — `RequestValidation` uses
`ISchemaDiscoveryService`, never `SchemaDiscovery`'s internals.

Each slice owns its DI registration (`AddSchemaDiscoveryFeature()`,
`MapSchemaDiscoveryFeature()`, …). `AddDomainDrivenRest()` is purely a composition root that
calls them, so a slice can be added or removed with one line.

**Tests live inside the slice** they cover (`Features/<Slice>/Tests/`). The package project
excludes them from compilation; `tests/DomainDrivenRest.Tests` compiles them as linked
files. So the shipped package carries no test code or xunit dependency, while a slice stays
genuinely self-contained.

### Frontend

```
ui/src/
  app/                        # host shell only: App, main, styles, shell/{TopBar,Rail}
  features/
    api-schema/               # _dto (wire types) · domain (resolve/label) · infrastructure (fetch)
    request-composer/         # domain (validate, codegen, sampleData) · application (stores) ·
                              #   infrastructure (send/validate) · ui (Composer, FormRenderer, …)
    domain-explorer/          # domain (deriveEntities) · ui (DomainExplorer, type graph)
    command-palette/          # ui
  shared/                     # ui (Icons, JsonHighlight) · domain (methods) · state (theme)
```

Same rules: `ui → application → domain`, and every slice exposes an `index.ts` barrel.
Cross-slice imports go through the barrel, never into a sibling's subfolders.

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

## Workspace improvements

The overview now includes live schema counts, a searchable endpoint directory, feature filters,
and direct access to request history. The responsive dark/light interface supports desktop
and narrow screens. Request bodies and parameters survive navigation within the current tab;
request cancellation, a 60-second timeout, duplicate-send protection, and required-parameter
checks make sending more predictable. Server-validation success is shown only after a confirmed
successful response.

Editor scripts and workers are packaged locally and loaded on demand. Embedded builds now
include newly hashed assets on the first build, and missing assets return 404. Automated
browser checks and the backend suite are wired into `.github/workflows/verify.yml`.
See `ui/README.md` for test commands, storage behavior, and hosting boundaries.
