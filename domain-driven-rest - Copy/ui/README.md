# Frontend workspace

React + TypeScript API workspace, embedded into the ASP.NET Core package.

## Run the complete application

From the repository root:

```powershell
dotnet build samples/DemoApi -p:ForceUiRebuild=true
dotnet run --project samples/DemoApi --no-build
```

Open http://localhost:5127/request-builder/. The sample launch profile enables Development mode, which mounts the tool. Keep the development-only mounting condition, or apply your host application's access controls before exposing the tool in another environment.

## Verify

```powershell
npm ci --prefix ui
npm run build --prefix ui
npm run lint --prefix ui
dotnet test DomainDrivenRest.slnx
npm run test:e2e --prefix ui
```

Browser tests automatically start the already-built sample API on port 5137. Windows uses installed Microsoft Edge. On Linux, first run `npx playwright install --with-deps chromium` from `ui/`. The GitHub Actions workflow builds the embedded UI, runs backend tests, and runs browser tests. It has been added locally; remote CI execution requires pushing the repository.

## Interaction and storage

- Overview searches endpoints by method, path, and feature. Filters compose and have an explicit reset state.
- Routes, contracts, and domain views share navigation. Small screens use stacked request panels and the search palette.
- Ctrl/Cmd+K opens search; Ctrl/Cmd+Enter sends a request. Keyboard sending is disabled while the palette is open.
- Request bodies and parameters survive navigation in the current tab. Reloading clears these in-memory drafts.
- Request history stores up to 50 entries locally, including request bodies. It never stores Authorization headers. Clear it from the history view.
- Authorization is masked and kept only in the current composer session.
- Cancelling stops the browser from waiting. It cannot undo work the server has already performed. Requests time out after 60 seconds.
- Local validation and server validation are distinct. Unavailable server validation never appears as success.
- Monaco and JSON workers are bundled locally and loaded on demand. No editor CDN or remote font is required. The editor chunks remain comparatively large; the workspace entry bundle is loaded separately.
- Monaco's vendored sanitizer is redirected to the patched DOMPurify package through the Vite alias and npm override. Keep these aligned when upgrading Monaco.

## Hosting

Assets use a relative Vite base. Middleware injects the configured route prefix into the shell, including for deep links. A forced build replaces generated assets and enumerates the new chunks before embedding them. Missing asset requests return HTTP 404 rather than an HTML shell.

The tool sends directly to your API using the browser's origin. The host API owns authentication, authorization, validation, and business behavior. OAuth flows, a CORS proxy, shared collections, and file uploads remain outside the current implementation.
