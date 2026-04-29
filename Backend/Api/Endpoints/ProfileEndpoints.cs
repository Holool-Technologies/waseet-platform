using Application.Features.Profile.DTOs;
using Infrastructure.Services;
using System.Security.Claims;


namespace Api.Endpoints;

public static class ProfileEndpoints
{
    public static void MapProfileEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/profile")
            .WithTags("Profile")
            .WithOpenApi()
            .RequireAuthorization();

        // Get own profile
        group.MapGet("/", async (
            ProfileService profileService,
            ClaimsPrincipal user, CancellationToken ct) =>
        {
            var userId = GetUserId(user);
            var profile = await profileService.GetOrCreateAsync(userId, ct);
            return Results.Ok(profile);
        });

        // Get public profile
        group.MapGet("/{userId:guid}/public", async (
            Guid userId,
            ProfileService profileService,
            CancellationToken ct) =>
        {
            try
            {
                var profile = await profileService.GetPublicAsync(userId, ct);
                return Results.Ok(profile);
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(new { message = ex.Message });
            }
        }).AllowAnonymous();

        // Preview bio (AI filter preview)
        group.MapPost("/bio/preview", async (
            PreviewBioRequest request,
            ProfileService profileService,
            CancellationToken ct) =>
        {
            var result = await profileService.PreviewBioAsync(request.Bio, ct);
            return Results.Ok(result);
        });

        // Update bio + title + skills
        group.MapPatch("/bio", async (
            UpdateBioRequest request,
            ProfileService profileService,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var userId = GetUserId(user);
            var profile = await profileService.UpdateBioAsync(userId, request, ct);
            return Results.Ok(profile);
        });

        // Upload portfolio image
        group.MapPost("/portfolio", async (
            HttpRequest request,
            ProfileService profileService,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var userId = GetUserId(user);
            var form = await request.ReadFormAsync(ct);
            var file = form.Files.GetFile("image");
            var caption = form["caption"].ToString();

            if (file is null)
                return Results.BadRequest(new { message = "Image file required." });

            if (file.Length > 10 * 1024 * 1024)
                return Results.BadRequest(new { message = "Image must be under 10MB." });

            try
            {
                await using var stream = file.OpenReadStream();
                var result = await profileService.UploadPortfolioImageAsync(
                    userId, stream, file.FileName, file.ContentType, caption, ct);
                return Results.Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { message = ex.Message });
            }
        }).DisableAntiforgery();

        // Admin: get pending portfolio items
        group.MapGet("/admin/portfolio/pending", async (
            ProfileService profileService, CancellationToken ct) =>
        {
            var items = await profileService.GetPendingPortfolioAsync(ct);
            return Results.Ok(items);
        }).RequireAuthorization("AdminOnly");

        // Admin: approve or reject portfolio item
        group.MapPatch("/admin/portfolio/{itemId:guid}/review", async (
            Guid itemId,
            AdminPortfolioReviewRequest request,
            ProfileService profileService,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var adminId = GetUserId(user);
            await profileService.AdminReviewPortfolioAsync(
                itemId, adminId, request.Decision, request.AdminNotes, ct);
            return Results.NoContent();
        }).RequireAuthorization("AdminOnly");
    }

    private static Guid GetUserId(ClaimsPrincipal user) =>
        Guid.Parse(user.FindFirstValue("sub")
            ?? user.FindFirstValue(ClaimTypes.NameIdentifier)!);
}

public record PreviewBioRequest(string Bio);