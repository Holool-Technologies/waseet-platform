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
        {
            // Each user joins their personal group for targeted notifications
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user:{userId}");
        }
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetUserId();
        if (userId != Guid.Empty)
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user:{userId}");
        await base.OnDisconnectedAsync(exception);
    }

    // ── Chat ──────────────────────────────────────────────────
    public async Task JoinTask(string taskId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"task:{taskId}");
    }

    public async Task LeaveTask(string taskId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"task:{taskId}");
    }

    public async Task SendMessage(string taskId, string content)
    {
        if (string.IsNullOrWhiteSpace(content) || content.Length > 2000) return;

        var userId = GetUserId();
        if (userId == Guid.Empty)
        {
            await Clients.Caller.SendAsync("Error", "Unauthorized.");
            return;
        }

        if (!Guid.TryParse(taskId, out var taskGuid)) return;

        try
        {
            var message = await _chatService.ProcessAndSaveAsync(userId, taskGuid, content);

            if (message.Blocked)
            {
                await Clients.Caller.SendAsync("MessageBlocked",
                    "Your message was blocked — contact information is not allowed.");
                return;
            }

            // ✅ Send to ALL in group INCLUDING caller (caller deduplicates client-side)
            // But we pass a flag so client knows it's their own message
            await Clients.Group($"task:{taskId}").SendAsync("ReceiveMessage", message);
        }
        catch (UnauthorizedAccessException)
        {
            await Clients.Caller.SendAsync("Error", "Not authorized for this task.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Chat error for task {TaskId}", taskId);
            await Clients.Caller.SendAsync("Error", "Send failed. Please retry.");
        }
    }

    public async Task Typing(string taskId)
    {
        await Clients.OthersInGroup($"task:{taskId}").SendAsync("UserTyping");
    }

    private Guid GetUserId()
    {
        var sub = Context.User?.FindFirstValue("sub")
               ?? Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(sub, out var id) ? id : Guid.Empty;
    }
}