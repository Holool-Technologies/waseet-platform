using System.Security.Claims;
using Waseet.Application.Features.Delivery.DTOs;
using Waseet.Application.Features.Delivery.Interfaces;

namespace Waseet.Api.Endpoints;

public static class DeliveryEndpoints
{
    public static void MapDeliveryEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/tasks/{code}/delivery")
            .WithTags("Delivery")
            .WithOpenApi()
            .RequireAuthorization();

        // Freelancer submits delivery — multipart with files + note
        group.MapPost("/", async (
            string code,
            HttpRequest request,
            IDeliveryService deliveryService,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var userId = GetUserId(user);
            var form = await request.ReadFormAsync(ct);
            var note = form["note"].ToString();
            var uploadedFiles = form.Files;

            if (uploadedFiles.Count == 0)
                return Results.BadRequest(new { code = "FILE_REQUIRED" });

            var files = new List<(Stream, string, string)>();
            foreach (var file in uploadedFiles)
                files.Add((file.OpenReadStream(), file.FileName, file.ContentType));

            try
            {
                var result = await deliveryService.SubmitDeliveryAsync(
                    userId, code, note, files, ct);
                return Results.Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { code = ex.Message });
            }
            catch (UnauthorizedAccessException)
            {
                return Results.Forbid();
            }
            finally
            {
                foreach (var (stream, _, _) in files)
                    await stream.DisposeAsync();
            }
        }).DisableAntiforgery();

        // Get the active delivery for a task
        group.MapGet("/", async (
            string code,
            IDeliveryService deliveryService,
            CancellationToken ct) =>
        {
            var delivery = await deliveryService.GetActiveDeliveryAsync(code, ct);
            return delivery is null
                ? Results.NotFound()
                : Results.Ok(delivery);
        });

        // Client accepts delivery
        group.MapPost("/{deliveryId:guid}/accept", async (
            string code,
            Guid deliveryId,
            IDeliveryService deliveryService,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var userId = GetUserId(user);
            try
            {
                var result = await deliveryService.AcceptDeliveryAsync(userId, deliveryId, ct);
                return Results.Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { code = ex.Message });
            }
            catch (UnauthorizedAccessException)
            {
                return Results.Forbid();
            }
        });

        // Client reports a problem with delivery
        group.MapPost("/{deliveryId:guid}/report", async (
            string code,
            Guid deliveryId,
            SubmitReportRequest request,
            IDeliveryService deliveryService,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var userId = GetUserId(user);
            try
            {
                var result = await deliveryService.ReportDeliveryAsync(
                    userId, deliveryId, request.Report, ct);
                return Results.Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { code = ex.Message });
            }
            catch (UnauthorizedAccessException)
            {
                return Results.Forbid();
            }
        });
    }

    private static Guid GetUserId(ClaimsPrincipal user) =>
        Guid.Parse(user.FindFirstValue("sub")
            ?? user.FindFirstValue(ClaimTypes.NameIdentifier)!);
}