using System.Security.Claims;
using Application.Features.Kyc.DTOs;
using Application.Features.Kyc.Interfaces;

namespace Api.Endpoints;

public static class KycEndpoints
{
    public static void MapKycEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/kyc")
            .WithTags("KYC")
            .WithOpenApi()
            .RequireAuthorization();

        // User: submit KYC
        group.MapPost("/submit", async (
            HttpRequest request,
            IKycService kycService,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? user.FindFirstValue("sub")!);

            var form = await request.ReadFormAsync(ct);
            var fullName = form["fullName"].ToString();
            var doc = form.Files.GetFile("document");

            if (string.IsNullOrWhiteSpace(fullName) || doc is null)
                return Results.BadRequest(new { message = "fullName and document are required." });

            if (doc.Length > 5 * 1024 * 1024)
                return Results.BadRequest(new { message = "Document must be under 5MB." });

            var allowed = new[] { ".jpg", ".jpeg", ".png", ".pdf" };
            var ext = Path.GetExtension(doc.FileName).ToLower();
            if (!allowed.Contains(ext))
                return Results.BadRequest(new { message = "Only JPG, PNG, PDF allowed." });

            try
            {
                await using var stream = doc.OpenReadStream();
                var result = await kycService.SubmitAsync(
                    userId, fullName, stream, doc.FileName, doc.ContentType, ct);
                return Results.Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return Results.Conflict(new { message = ex.Message });
            }
        })
        .DisableAntiforgery();

        // User: get own KYC status
        group.MapGet("/status", async (
            IKycService kycService,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? user.FindFirstValue("sub")!);

            try
            {
                var result = await kycService.GetStatusAsync(userId, ct);
                return Results.Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound(new { message = "No KYC record found." });
            }
        });

        // Admin: list pending KYC
        group.MapGet("/admin/pending", async (
            IKycService kycService,
            CancellationToken ct) =>
        {
            var list = await kycService.GetPendingAsync(ct);
            return Results.Ok(list);
        });
        // TODO: Add [Authorize(Roles = "Admin")] when admin role is implemented

        // Admin: approve or reject
        group.MapPatch("/admin/{kycId:guid}/decide", async (
            Guid kycId,
            KycDecisionRequest request,
            IKycService kycService,
            CancellationToken ct) =>
        {
            if (request.Decision.ToLower() is not "approve" and not "reject")
                return Results.BadRequest(new { message = "Decision must be 'approve' or 'reject'." });

            try
            {
                await kycService.DecideAsync(kycId, request.Decision, ct);
                return Results.NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(new { message = ex.Message });
            }
        });
    }
}