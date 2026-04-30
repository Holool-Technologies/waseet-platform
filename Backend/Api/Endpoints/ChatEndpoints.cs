using Application.Features.Chat.DTOs;
using Application.Features.Chat.Interfaces;
using System.Security.Claims;

namespace Api.Endpoints;

public static class ChatEndpoints
{
    public static void MapChatEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/chat")
            .WithTags("Chat")
            .WithOpenApi()
            .RequireAuthorization();

        // Get message history for a task
        group.MapGet("/{taskId:guid}/messages", async (
            Guid taskId,
            IChatService chatService,
            ClaimsPrincipal user,
            int page,
            int pageSize,
            CancellationToken ct) =>
        {
            var userId = GetUserId(user);
            try
            {
                var messages = await chatService.GetHistoryAsync(
                    taskId, userId, page, pageSize, ct);
                return Results.Ok(messages);
            }
            catch (UnauthorizedAccessException)
            {
                return Results.Forbid();
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(new { message = ex.Message });
            }
        });

        group.MapGet("/inbox", async (
    IChatService chatService,
    ClaimsPrincipal user, CancellationToken ct) =>
        {
            var userId = GetUserId(user);
            var inbox = await chatService.GetInboxAsync(userId, ct);
            return Results.Ok(inbox);
        });

        // Open or get conversation between client and a specific bidder
        group.MapPost("/conversation/open", async (
            OpenConversationRequest request,
            IChatService chatService,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var userId = GetUserId(user);
            await chatService.EnsureConversationAsync(
                request.TaskId, userId, request.FreelancerUserId, ct);
            return Results.Ok(new { taskId = request.TaskId });
        });

        // Get messages for a specific conversation (by taskId + the other party)
        group.MapGet("/conversation/{taskId:guid}", async (
            Guid taskId,
            IChatService chatService,
            ClaimsPrincipal user,
            int page, int pageSize,
            CancellationToken ct) =>
        {
            var userId = GetUserId(user);
            var messages = await chatService.GetHistoryAsync(taskId, userId, page, pageSize, ct);
            return Results.Ok(messages);
        });
    }

    private static Guid GetUserId(ClaimsPrincipal user) =>
        Guid.Parse(user.FindFirstValue("sub")
            ?? user.FindFirstValue(ClaimTypes.NameIdentifier)!);


}

