using Application.Features.Chat.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace Api.Hubs;

[Authorize]
public class ChatHub : Hub
{
    private readonly IChatService _chatService;
    private readonly ILogger<ChatHub> _logger;

    public ChatHub(IChatService chatService, ILogger<ChatHub> logger)
    {
        _chatService = chatService;
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation("SignalR connected: {ConnectionId}", Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("SignalR disconnected: {ConnectionId}", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    // Client calls this to join a task chat room
    public async Task JoinTask(string taskId)
    {
        if (!Guid.TryParse(taskId, out _))
        {
            await Clients.Caller.SendAsync("Error", "Invalid task ID.");
            return;
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, taskId);
        _logger.LogInformation("User joined task group: {TaskId}", taskId);
    }

    // Client calls this to leave a task chat room
    public async Task LeaveTask(string taskId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, taskId);
    }

    // Client calls this to send a message
    public async Task SendMessage(string taskId, string content)
    {
        if (string.IsNullOrWhiteSpace(content))
            return;

        if (content.Length > 2000)
        {
            await Clients.Caller.SendAsync("Error", "Message too long. Max 2000 characters.");
            return;
        }

        var userId = GetUserId();
        if (userId == Guid.Empty)
        {
            await Clients.Caller.SendAsync("Error", "Unauthorized.");
            return;
        }

        if (!Guid.TryParse(taskId, out var taskGuid))
        {
            await Clients.Caller.SendAsync("Error", "Invalid task ID.");
            return;
        }

        try
        {
            var message = await _chatService.ProcessAndSaveAsync(userId, taskGuid, content);

            if (message.Blocked)
            {
                // Notify only the sender that their message was blocked
                await Clients.Caller.SendAsync("MessageBlocked",
                    "Your message was blocked — it appeared to contain contact information.");
                return;
            }

            // Broadcast sanitized message to all task group members
            await Clients.Group(taskId).SendAsync("ReceiveMessage", message);
        }
        catch (UnauthorizedAccessException)
        {
            await Clients.Caller.SendAsync("Error", "You are not a party to this task.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing message for task {TaskId}", taskId);
            await Clients.Caller.SendAsync("Error", "Failed to send message. Please try again.");
        }
    }

    // Typing indicator
    public async Task Typing(string taskId)
    {
        var userId = GetUserId();
        await Clients.OthersInGroup(taskId).SendAsync("UserTyping", taskId);
    }

    private Guid GetUserId()
    {
        var sub = Context.User?.FindFirstValue("sub")
               ?? Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(sub, out var id) ? id : Guid.Empty;
    }
}