using System.Net.Mime;
using System.Security.Claims;
using Microsoft.AspNetCore.StaticFiles;

namespace Api.Endpoints;

public static class FileEndpoints
{
    public static void MapFileEndpoints(this WebApplication app)
    {
        // Authenticated file endpoint —
        //
        //
        //
        // docs + portfolio images
        app.MapGet("/api/files/{*blobRef}", async (
            string blobRef,
            HttpContext context,
            CancellationToken ct) =>
        {
            // Sanitize path — prevent directory traversal
            var safePath = Path.GetFullPath(
                Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", blobRef));

            var wwwRoot = Path.GetFullPath(
                Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"));

            if (!safePath.StartsWith(wwwRoot))
                return Results.BadRequest("Invalid path.");

            if (!File.Exists(safePath))
                return Results.NotFound();

            // Determine content type
            var provider = new FileExtensionContentTypeProvider();
            if (!provider.TryGetContentType(safePath, out var contentType))
                contentType = MediaTypeNames.Application.Octet;

            var bytes = await File.ReadAllBytesAsync(safePath, ct);
            return Results.File(bytes, contentType, enableRangeProcessing: true);
        }).RequireAuthorization();

    }
}