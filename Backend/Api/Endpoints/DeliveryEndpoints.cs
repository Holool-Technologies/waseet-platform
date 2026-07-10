using Application.Features.Delivery.DTOs;
using Application.Features.Delivery.Interfaces;
using System.Security.Claims;
using System.Text.Json;


namespace Api.Endpoints;

public static class DeliveryEndpoints
{
    public static void MapDeliveryEndpoints(this WebApplication app)
    {
        var grp = app.MapGroup("/api/tasks/{code}/delivery")
            .WithTags("Delivery")
            .RequireAuthorization();

        // Freelancer submits delivery
        grp.MapPost("/", async (
    string code, HttpRequest req,
    IDeliveryService svc,
    ClaimsPrincipal user, CancellationToken ct) =>
        {
            var uid = GetUid(user);
            var form = await req.ReadFormAsync(ct);
            var note = form["note"].ToString();
            var videoUrl = form["videoUrl"].ToString();
            var progressPercent = int.TryParse(form["progressPercent"], out var pp) ? pp : 100;

            // Parse links JSON
            var linksJson = form["links"].ToString();
            var links = string.IsNullOrWhiteSpace(linksJson)
                ? new List<DeliveryLink>()
                : JsonSerializer.Deserialize<List<DeliveryLink>>(linksJson) ?? [];

            // Parse checklist JSON
            var checklistJson = form["checklist"].ToString();
            var checklist = string.IsNullOrWhiteSpace(checklistJson)
                ? new List<DeliveryChecklistItem>()
                : JsonSerializer.Deserialize<List<DeliveryChecklistItem>>(checklistJson) ?? [];

            var raw = req.Form.Files;
            if (raw.Count == 0)
                return Results.BadRequest(new { code = "FILE_REQUIRED" });

            var files = raw.Select(f =>
                ((Stream)f.OpenReadStream(), f.FileName, f.ContentType)).ToList();

            try
            {
                var r = await svc.SubmitDeliveryAsync(
                    uid, code, note, videoUrl, links, checklist,
                    progressPercent, files, ct);
                return Results.Ok(r);
            }
            catch (UnauthorizedAccessException) { return Results.Forbid(); }
            catch (InvalidOperationException ex)
            { return Results.BadRequest(new { code = ex.Message }); }
            finally { foreach (var (s, _, _) in files) await s.DisposeAsync(); }
        }).DisableAntiforgery();

        // Get active delivery
        grp.MapGet("/", async (
            string code,
            IDeliveryService svc,
            ClaimsPrincipal user, CancellationToken ct) =>
        {
            try
            {
                var r = await svc.GetActiveDeliveryAsync(code, GetUid(user), ct);
                return r is null ? Results.NotFound() : Results.Ok(r);
            }
            catch (UnauthorizedAccessException) { return Results.Forbid(); }
        });

        // Client accepts
        grp.MapPost("/{deliveryId:guid}/accept", async (
            string code, Guid deliveryId,
            IDeliveryService svc,
            ClaimsPrincipal user, CancellationToken ct) =>
        {
            try
            {
                var r = await svc.AcceptDeliveryAsync(GetUid(user), deliveryId, ct);
                return Results.Ok(r);
            }
            catch (UnauthorizedAccessException) { return Results.Forbid(); }
            catch (InvalidOperationException ex)
            { return Results.BadRequest(new { code = ex.Message }); }
        });

        // Client requests revision
        grp.MapPost("/{deliveryId:guid}/revise", async (
            string code, Guid deliveryId,
            RequestRevisionRequest req,
            IDeliveryService svc,
            ClaimsPrincipal user, CancellationToken ct) =>
        {
            try
            {
                var r = await svc.RequestRevisionAsync(GetUid(user), deliveryId, req.Reason, ct);
                return Results.Ok(r);
            }
            catch (UnauthorizedAccessException) { return Results.Forbid(); }
            catch (InvalidOperationException ex)
            { return Results.BadRequest(new { code = ex.Message }); }
        });
        // All deliveries for a task (history)
        grp.MapGet("/history", async (
            string code,
            IDeliveryService svc,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var uid = GetUid(user);
            var history = await svc.GetDeliveryHistoryAsync(code, uid, ct);
            return Results.Ok(history);
        });

        // All revisions for a task
        grp.MapGet("/revisions", async (
            string code,
            IDeliveryService svc,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var uid = GetUid(user);
            var revisions = await svc.GetRevisionRequestsAsync(code, uid, ct);
            return Results.Ok(revisions);
        });
        // Client opens dispute
        grp.MapPost("/{deliveryId:guid}/dispute", async (
            string code, Guid deliveryId,
            OpenDisputeRequest req,
            IDeliveryService svc,
            ClaimsPrincipal user, CancellationToken ct) =>
        {
            try
            {
                var r = await svc.OpenDisputeAsync(GetUid(user), deliveryId, req.Report, ct);
                return Results.Ok(r);
            }
            catch (UnauthorizedAccessException) { return Results.Forbid(); }
            catch (InvalidOperationException ex)
            { return Results.BadRequest(new { code = ex.Message }); }
        });

        // Get audit log for a delivery
        grp.MapGet("/{deliveryId:guid}/audit", async (
            string code, Guid deliveryId,
            IDeliveryService svc, CancellationToken ct) =>
            Results.Ok(await svc.GetDeliveryAuditLogsAsync(deliveryId, ct)));

        // ── Admin endpoints ──────────────────────────────────────────────────
        var admin = app.MapGroup("/api/admin")
            .WithTags("Admin")
            .RequireAuthorization("AdminOnly");

        admin.MapGet("/disputes", async (
            IDeliveryService svc, CancellationToken ct) =>
            Results.Ok(await svc.GetOpenDisputesAsync(ct)));

        admin.MapPost("/disputes/{disputeId:guid}/claim", async (
            Guid disputeId,
            IDeliveryService svc,
            ClaimsPrincipal user, CancellationToken ct) =>
        {
            try
            {
                var r = await svc.AdminClaimDisputeAsync(GetUid(user), disputeId, ct);
                return Results.Ok(r);
            }
            catch (InvalidOperationException ex)
            { return Results.BadRequest(new { code = ex.Message }); }
        });

        admin.MapPost("/disputes/{disputeId:guid}/resolve", async (
            Guid disputeId,
            AdminResolveDisputeRequest req,
            IDeliveryService svc,
            ClaimsPrincipal user, CancellationToken ct) =>
        {
            try
            {
                var r = await svc.AdminResolveDisputeAsync(
                    GetUid(user), disputeId,
                    req.Resolution, req.AdminNotes, ct,
                    req.FreelancerAmount, req.ClientRefundAmount
                    );
                return Results.Ok(r);
            }
            catch (InvalidOperationException ex)
            { return Results.BadRequest(new { code = ex.Message }); }
        });

        admin.MapGet("/delivery-settings", async (IDeliveryService svc, CancellationToken ct) =>
            Results.Ok(await svc.GetSettingsAsync(ct)));

        admin.MapPatch("/delivery-settings", async (
            DeliverySettingsResponse req,
            IDeliveryService svc, CancellationToken ct) =>
        {
            await svc.UpdateSettingsAsync(req.ReviewWindowDays, req.MaxRevisions, ct);
            return Results.NoContent();
        });
        admin.MapGet("/disputes/{disputeId:guid}/case", async (
                   Guid disputeId,
                  IDeliveryService svc,
                  CancellationToken ct) =>
        {
            try
            {
                var r = await svc.GetDisputeCaseAsync(disputeId, ct);
                return Results.Ok(r);
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(new { message = ex.Message });
            }
        });
    }

    private static Guid GetUid(ClaimsPrincipal user) =>
        Guid.Parse(user.FindFirstValue("sub")
            ?? user.FindFirstValue(ClaimTypes.NameIdentifier)!);
}