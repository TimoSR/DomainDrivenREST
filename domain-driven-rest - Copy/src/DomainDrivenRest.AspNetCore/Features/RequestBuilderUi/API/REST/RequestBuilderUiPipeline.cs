using DomainDrivenRest.Features.RequestBuilderUi.Critical;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.FileProviders;

namespace DomainDrivenRest.Features.RequestBuilderUi.Api.Rest;

/// <summary>
/// Transport layer for the RequestBuilderUi slice: serves the embedded SPA. Mounted inside
/// a branch already scoped to the route prefix, so paths here are prefix-relative.
/// </summary>
public static class RequestBuilderUiPipeline
{
    public static IApplicationBuilder UseRequestBuilderUiFeature(
        this IApplicationBuilder app, IFileProvider files, string basePath)
    {
        // The shell is identical for every request under this prefix, so build it once.
        var shell = new Lazy<string>(() => BuildShell(files, basePath));

        app.Use(async (context, next) =>
        {
            if (context.Request.Path.StartsWithSegments("/assets") && !files.GetFileInfo(context.Request.Path).Exists)
            {
                context.Response.StatusCode = StatusCodes.Status404NotFound;
                return;
            }

            if (!IsShellRequest(files, context.Request.Path))
            {
                await next();
                return;
            }

            // Client-side routed SPA: every non-asset path under the prefix gets the shell.
            context.Response.ContentType = EmbeddedUiLocation.ShellContentType;
            await context.Response.WriteAsync(shell.Value);
        });

        app.UseStaticFiles(new StaticFileOptions { FileProvider = files });
        return app;
    }

    /// <summary>
    /// Anything the embedded provider can actually serve is an asset; everything else is a
    /// client-side route. Checking the provider rather than sniffing for a file extension
    /// matters because entity ids are CLR type names — "/domain/DemoApi.Models.Order" looks
    /// like it has an extension but is a route.
    /// </summary>
    private static bool IsShellRequest(IFileProvider files, PathString path)
    {
        var value = path.Value;
        return string.IsNullOrEmpty(value) || value == "/" || !files.GetFileInfo(value).Exists;
    }

    /// <summary>
    /// Injects the mount point the middleware is actually running under. The SPA's assets
    /// are built with a relative base and it reads its router base from document.baseURI,
    /// so RoutePrefix can be changed freely without rebuilding the UI.
    /// </summary>
    private static string BuildShell(IFileProvider files, string basePath)
    {
        var file = files.GetFileInfo(EmbeddedUiLocation.ShellFile);
        if (!file.Exists)
        {
            return EmbeddedUiLocation.MissingShellHtml;
        }

        using var reader = new StreamReader(file.CreateReadStream());
        var html = reader.ReadToEnd();

        return html.Contains(EmbeddedUiLocation.HeadToken, StringComparison.OrdinalIgnoreCase)
            ? html.Replace(
                EmbeddedUiLocation.HeadToken,
                $"{EmbeddedUiLocation.HeadToken}<base href=\"{basePath}\">",
                StringComparison.OrdinalIgnoreCase)
            : html;
    }
}
