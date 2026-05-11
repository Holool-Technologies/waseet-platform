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

        // Open or get conversation (does NOT create until first message)
        group.MapPost("/conversation/open", async (
            OpenConversationRequest request,
            IChatService chatService,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var userId = GetUserId(user);
            try
            {
                var result = await chatService.OpenConversationAsync(
                    userId, request.TaskId, request.FreelancerUserId, ct);
                return Results.Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Results.Forbid();
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { message = ex.Message });
            }
        });

        // Get message history for a conversation
        // Fix 9: checks conversation party not task party
        group.MapGet("/conversation/{conversationId:guid}/messages", async (
            Guid conversationId,
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
                    conversationId, userId,
                    page <= 0 ? 1 : page,
                    pageSize <= 0 ? 50 : pageSize,
                    ct);
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

        // Inbox — only conversations with messages
        group.MapGet("/inbox", async (
            IChatService chatService,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var userId = GetUserId(user);
            var inbox = await chatService.GetInboxAsync(userId, ct);
            return Results.Ok(inbox);
        });

        // Mark conversation as read — called when user opens a conversation
        group.MapPost("/conversation/{conversationId:guid}/read", async (
            Guid conversationId,
            IChatService chatService,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var userId = GetUserId(user);
            await chatService.MarkConversationReadAsync(conversationId, userId, ct);
            return Results.NoContent();
        });
    }

    private static Guid GetUserId(ClaimsPrincipal user) =>
        Guid.Parse(user.FindFirstValue("sub")
            ?? user.FindFirstValue(ClaimTypes.NameIdentifier)!);
}