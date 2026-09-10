using DomainDrivenRest.AspNetCore.Api;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Options;

namespace DomainDrivenRest.AspNetCore;

public static class DomainDrivenRestApplicationBuilderExtensions
{
    /// <summary>
    /// Mounts the request-builder UI and its API (schema.json, validate) at
    /// options.RoutePrefix, e.g. "/request-builder".
    /// </summary>
    public static IApplicationBuilder UseDomainDrivenRest(this IApplicationBuilder app)
    {
        var options = app.ApplicationServices.GetRequiredService<IOptions<DomainDrivenRestOptions>>().Value;
        var routePrefix = options.RoutePrefix.Trim('/');

        var embeddedProvider = new EmbeddedFileProvider(
            typeof(DomainDrivenRestApplicationBuilderExtensions).Assembly, "DomainDrivenRest.AspNetCore.wwwroot.dist");

        // Map() strips the "/request-builder" prefix from PathBase for everything inside
        // this branch, so nested routes/static files are addressed relative to it
        // ("/api/schema.json", "/index.html", …) regardless of where the app itself mounts.
        app.Map($"/{routePrefix}", uiApp =>
        {
            uiApp.UseRouting();
            uiApp.UseEndpoints(endpoints => endpoints.MapDomainDrivenRestApi());

            // Only fall through to the static UI pipeline for non-API paths — the API is
            // already handled by endpoint routing above.
            uiApp.UseWhen(
                context => !context.Request.Path.StartsWithSegments("/api"),
                staticApp =>
                {
                    staticApp.UseDefaultFiles(new DefaultFilesOptions { FileProvider = embeddedProvider });

                    // Client-side routed SPA: fall back to index.html for any path that isn't a static asset.
                    staticApp.Use(async (context, next) =>
                    {
                        await next();
                        if (context.Response.StatusCode == StatusCodes.Status404NotFound)
                        {
                            context.Response.StatusCode = StatusCodes.Status200OK;
                            context.Request.Path = "/index.html";
                            await next();
                        }
                    });

                    staticApp.UseStaticFiles(new StaticFileOptions { FileProvider = embeddedProvider });
                });
        });

        return app;
    }
}
