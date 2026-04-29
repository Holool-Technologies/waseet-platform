using Application.Features.Notifications.Interfaces;
using System.Security.Claims;

namespace Api.Endpoints;

public static class NotificationEndpoints
{
    public static void MapNotificationEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/notifications")
            .WithTags("Notifications")
            .WithOpenApi()
            .RequireAuthorization();

        group.MapGet("/", async (
            INotificationService notificationService,
            ClaimsPrincipal user,
            string lang,
            int page, int pageSize,
            CancellationToken ct) =>
        {
            var userId = GetUserId(user);
            var items = await notificationService.GetForUserAsync(
                userId, lang ?? "en", page, pageSize, ct);
            return Results.Ok(items);
        });

        group.MapGet("/unread-count", async (
            INotificationService notificationService,
            ClaimsPrincipal user, CancellationToken ct) =>
        {
            var userId = GetUserId(user);
            var count = await notificationService.GetUnreadCountAsync(userId, ct);
            return Results.Ok(new { unreadCount = count });
        });

        group.MapPatch("/{notificationId:guid}/read", async (
            Guid notificationId,
            INotificationService notificationService,
            ClaimsPrincipal user, CancellationToken ct) =>
        {
            await notificationService.MarkReadAsync(notificationId, GetUserId(user), ct);
            return Results.NoContent();
        });

        group.MapPatch("/read-all", async (
            INotificationService notificationService,
            ClaimsPrincipal user, CancellationToken ct) =>
        {
            await notificationService.MarkAllReadAsync(GetUserId(user), ct);
            return Results.NoContent();
        });
    }

    private static Guid GetUserId(ClaimsPrincipal user) =>
        Guid.Parse(user.FindFirstValue("sub")
            ?? user.FindFirstValue(ClaimTypes.NameIdentifier)!);
}