using DomainDrivenRest.Features.RequestBuilderUi.Api.Rest;
using DomainDrivenRest.Features.RequestBuilderUi.Infrastructure;
using DomainDrivenRest.Features.RequestValidation.Api.Rest;
using DomainDrivenRest.Features.SchemaDiscovery.Api.Rest;
using DomainDrivenRest.Shared.Configuration;
using DomainDrivenRest.Shared.Critical;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace DomainDrivenRest.AspNetCore;

/// <summary>
/// Mounts every feature slice's transport layer under the configured route prefix. Like the
/// service-collection counterpart, this only calls each slice's published entry point.
/// </summary>
public static class DomainDrivenRestApplicationBuilderExtensions
{
    public static IApplicationBuilder UseDomainDrivenRest(this IApplicationBuilder app)
    {
        var options = app.ApplicationServices.GetRequiredService<IOptions<DomainDrivenRestOptions>>().Value;
        var routePrefix = options.RoutePrefix.Trim('/');
        var uiFiles = app.ApplicationServices.GetRequiredService<EmbeddedUiFileProvider>();

        // Map() strips the prefix from PathBase for everything inside this branch, so nested
        // routes and static files are addressed relative to it regardless of where the host
        // app itself is mounted.
        app.Map($"/{routePrefix}", branch =>
        {
            branch.UseRouting();
            branch.UseEndpoints(endpoints =>
            {
                endpoints.MapSchemaDiscoveryFeature();
                endpoints.MapRequestValidationFeature();
            });

            // Only fall through to the static UI for non-API paths — the slices above
            // already own everything under /api. The UI is told the mount point it is
            // running under so it can resolve its own assets and routes.
            branch.UseWhen(
                context => !context.Request.Path.StartsWithSegments(ToolApiRoutes.ApiSegment),
                ui => ui.UseRequestBuilderUiFeature(uiFiles.Files, $"/{routePrefix}/"));
        });

        return app;
    }
}
