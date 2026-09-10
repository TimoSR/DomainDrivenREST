/**
 * Where this SPA is mounted, discovered at runtime.
 *
 * High-stability zone. The mount point is NOT compiled in: the ASP.NET Core middleware
 * injects `<base href="/<RoutePrefix>/">` into the shell it serves, so the same build works
 * under any `DomainDrivenRestOptions.RoutePrefix`. Read the base from here rather than from
 * `import.meta.env.BASE_URL`, which is only ever "./" now.
 *
 * Mirrors DomainDrivenRest.Shared.Critical.ToolApiRoutes on the server.
 */

/** e.g. "/request-builder" — no trailing slash, so it can be concatenated safely. */
export const APP_BASE_PATH: string = new URL(document.baseURI).pathname.replace(/\/+$/, "");

/** Segment under the mount point reserved for the tool's own endpoints. */
export const TOOL_API_SEGMENT = "/api";

export const TOOL_API_ROUTES = {
  schemaDocument: `${APP_BASE_PATH}${TOOL_API_SEGMENT}/schema.json`,
  validateBody: `${APP_BASE_PATH}${TOOL_API_SEGMENT}/validate`,
  refreshQuery: "refresh",
} as const;

/**
 * Client-side routes. Referenced everywhere that navigates, so changes are broad.
 *
 * The three top-level sections mirror the layering: routes are the transport, contracts
 * are the shapes crossing it, the domain is what the app actually models.
 */
export const APP_ROUTES = {
  home: "/",
  endpoint: (operationId: string) => `/endpoints/${encodeURIComponent(operationId)}`,
  endpointPattern: "/endpoints/:operationId",

  contracts: "/contracts",
  contract: (entityId: string) => `/contracts/${encodeURIComponent(entityId)}`,
  contractPattern: "/contracts/:entityId",

  domain: "/domain",
  entity: (entityId: string) => `/domain/${encodeURIComponent(entityId)}`,
  entityPattern: "/domain/:entityId",
} as const;
