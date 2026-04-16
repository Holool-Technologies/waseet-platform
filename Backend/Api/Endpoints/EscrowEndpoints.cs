using System.Security.Claims;
using Waseet.Application.Features.Tasks.Interfaces;

namespace Api.Endpoints;

public static class EscrowEndpoints
{
    public static void MapEscrowEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/escrow")
            .WithTags("Escrow")
            .WithOpenApi()
            .RequireAuthorization();

        group.MapPatch("/{escrowId:guid}/release", async (
            Guid escrowId,
            ITaskService taskService,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var userId = GetUserId(user);
            try
            {
                var escrow = await taskService.ReleaseEscrowAsync(userId, escrowId, ct);
                return Results.Ok(escrow);
            }
            catch (UnauthorizedAccessException) { return Results.Forbid(); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return Results.NotFound(new { message = ex.Message }); }
        });

        group.MapPatch("/{escrowId:guid}/dispute", async (
            Guid escrowId,
            ITaskService taskService,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var userId = GetUserId(user);
            try
            {
                var escrow = await taskService.DisputeEscrowAsync(userId, escrowId, ct);
                return Results.Ok(escrow);
            }
            catch (UnauthorizedAccessException) { return Results.Forbid(); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return Results.NotFound(new { message = ex.Message }); }
        });
    }

    private static Guid GetUserId(ClaimsPrincipal user) =>
        Guid.Parse(user.FindFirstValue("sub")
            ?? user.FindFirstValue(ClaimTypes.NameIdentifier)!);
}