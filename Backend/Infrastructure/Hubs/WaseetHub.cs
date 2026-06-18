using Application.Features.Chat.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using System.Security.Claims;

namespace Infrastructure;

[Authorize]
public class WaseetHub : Hub
{
    private readonly IChatService _chatService;
    private readonly ILogger<WaseetHub> _logger;

    public WaseetHub(IChatService chatService, ILogger<WaseetHub> logger)
    {
        _chatService = chatService;
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = GetUserId();
        if (userId != Guid.Empty)
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user:{userId}");
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetUserId();
        if (userId != Guid.Empty)
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user:{userId}");
        await base.OnDisconnectedAsync(exception);
    }

    // ── Join a CONVERSATION room (not task room) ──────────────
    public async Task JoinConversation(string conversationId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"conv:{conversationId}");
    }

    public async Task LeaveConversation(string conversationId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"conv:{conversationId}");
    }

    // ── Send message scoped to conversation ───────────────────
    public async Task SendMessage(string conversationId, string content)
    {
        if (string.IsNullOrWhiteSpace(content) || content.Length > 2000)
        {
            await Clients.Caller.SendAsync("Error", "MSG_TOO_LONG");
            return;
        }

        var userId = GetUserId();
        if (userId == Guid.Empty)
        {
            await Clients.Caller.SendAsync("Error", "UNAUTHORIZED");
            return;
        }

        if (!Guid.TryParse(conversationId, out var convGuid))
        {
            await Clients.Caller.SendAsync("Error", "INVALID_CONVERSATION");
            return;
        }

        try
        {
            var message = await _chatService.ProcessAndSaveAsync(
                userId, convGuid, content);

            if (message.Blocked)
            {
                await Clients.Caller.SendAsync("MessageBlocked", "MSG_BLOCKED");
                return;
            }

            await Clients.Group($"conv:{conversationId}")
                .SendAsync("ReceiveMessage", message);
        }
        catch (UnauthorizedAccessException)
        {
            await Clients.Caller.SendAsync("Error", "NOT_CONVERSATION_PARTY");
        }
        catch (KeyNotFoundException)
        {
            await Clients.Caller.SendAsync("Error", "CONVERSATION_NOT_FOUND");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SendMessage failed conv:{ConvId}", conversationId);
            await Clients.Caller.SendAsync("Error", "SEND_FAILED");
        }
    }

    public async Task SendFirstMessage(
        string taskId, string freelancerUserId, string content)
    {
        if (string.IsNullOrWhiteSpace(content) || content.Length > 2000)
        {
            await Clients.Caller.SendAsync("Error", "MSG_TOO_LONG");
            return;
        }

        var userId = GetUserId();
        if (userId == Guid.Empty)
        {
            await Clients.Caller.SendAsync("Error", "UNAUTHORIZED");
            return;
        }

        if (!Guid.TryParse(taskId, out var taskGuid) ||
            !Guid.TryParse(freelancerUserId, out var freelancerGuid))
        {
            await Clients.Caller.SendAsync("Error", "INVALID_DATA");
            return;
        }

        try
        {
            var message = await _chatService.ProcessFirstMessageAsync(
                userId, taskGuid, freelancerGuid, content);

            if (message.Blocked)
            {
                await Clients.Caller.SendAsync("MessageBlocked", "MSG_BLOCKED");
                return;
            }

            await Clients.Group($"conv:{message.ConversationId}")
                .SendAsync("ReceiveMessage", message);
        }
        catch (UnauthorizedAccessException)
        {
            await Clients.Caller.SendAsync("Error", "NOT_CONVERSATION_PARTY");
        }
        catch (InvalidOperationException)
        {
            await Clients.Caller.SendAsync("Error", "NOT_ALLOWED");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SendFirstMessage failed");
            await Clients.Caller.SendAsync("Error", "SEND_FAILED");
        }
    }

    public async Task Typing(string conversationId)
    {
        await Clients.OthersInGroup($"conv:{conversationId}")
            .SendAsync("UserTyping", conversationId);
    }

    private Guid GetUserId()
    {
        var sub = Context.User?.FindFirstValue("sub")
               ?? Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(sub, out var id) ? id : Guid.Empty;
    }

    private static Guid DeterministicGuid(Guid taskId, Guid clientId, Guid freelancerId)
    {
        var combined = $"{taskId}:{clientId}:{freelancerId}";
        using var md5 = System.Security.Cryptography.MD5.Create();
        var hash = md5.ComputeHash(System.Text.Encoding.UTF8.GetBytes(combined));
        return new Guid(hash);
    }
}