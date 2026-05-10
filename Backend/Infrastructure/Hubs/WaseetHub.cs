using Application.Features.Chat.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using System.Security.Claims;

namespace Infrastructure.Hubs;

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
    public async Task SendMessage(Guid senderUserId,string conversationId, string content)
    {
        if (string.IsNullOrWhiteSpace(content) || content.Length > 2000) return;

        if (senderUserId == Guid.Empty)
        {
            await Clients.Caller.SendAsync("Error", "Unauthorized.");
            return;
        }

        if (!Guid.TryParse(conversationId, out var convGuid)) return;

        try
        {
            var message = await _chatService.ProcessAndSaveAsync(
                senderUserId, convGuid, content);

            if (message.Blocked)
            {
                await Clients.Caller.SendAsync("MessageBlocked",
                    "Your message was blocked — contact information is not allowed.");
                return;
            }

            // Broadcast ONLY to conversation room — no cross-leakage
            await Clients.Group($"conv:{conversationId}")
                .SendAsync("ReceiveMessage", message);
        }
        catch (UnauthorizedAccessException ex)
        {
            await Clients.Caller.SendAsync("Error", ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SendMessage failed conv:{ConvId}", conversationId);
            await Clients.Caller.SendAsync("Error", "Send failed. Please retry.");
        }
    }

    // ── Send first message (creates conversation lazily) ──────
    //public async Task SendFirstMessage(
    //    string taskId, string freelancerUserId, string content)
    //{
    //    if (string.IsNullOrWhiteSpace(content) || content.Length > 2000) return;

    //    var userId = GetUserId();
    //    if (userId == Guid.Empty) return;

    //    if (!Guid.TryParse(taskId, out var taskGuid)) return;
    //    if (!Guid.TryParse(freelancerUserId, out var freelancerGuid)) return;

    //    try
    //    {
    //        var message = await _chatService.ProcessFirstMessageAsync(
    //            userId, taskGuid, freelancerGuid, content);

    //        if (message.Blocked)
    //        {
    //            await Clients.Caller.SendAsync("MessageBlocked",
    //                "Your message was blocked.");
    //            return;
    //        }

    //        await Clients.Group($"conv:{message.ConversationId}")
    //            .SendAsync("ReceiveMessage", message);
    //    }
    //    catch (Exception ex)
    //    {
    //        _logger.LogError(ex, "SendFirstMessage failed");
    //        await Clients.Caller.SendAsync("Error", "Send failed.");
    //    }
    //}

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
}