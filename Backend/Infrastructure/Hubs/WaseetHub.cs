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
    public async Task SendFirstMessage(string taskId, string freelancerUserId, string content)
    {
        if (string.IsNullOrWhiteSpace(content) || content.Length > 2000)
        {
            await Clients.Caller.SendAsync("Error", "Message is empty or too long.");
            return;
        }

        var senderUserId = GetUserId();
        if (senderUserId == Guid.Empty)
        {
            await Clients.Caller.SendAsync("Error", "Unauthorized.");
            return;
        }

        if (!Guid.TryParse(taskId, out var taskGuid))
        {
            await Clients.Caller.SendAsync("Error", "Invalid task ID.");
            return;
        }

        if (!Guid.TryParse(freelancerUserId, out var freelancerGuid))
        {
            await Clients.Caller.SendAsync("Error", "Invalid freelancer ID.");
            return;
        }

        try
        {
            _logger.LogInformation("SendFirstMessage: sender={SenderId}, task={TaskId}, freelancer={FreelancerId}", 
                senderUserId, taskGuid, freelancerGuid);

            // Sender must be the task client
            Guid clientId = senderUserId;
            Guid actualFreelancerId = freelancerGuid;

            // Just validate, EnsureConversationAsync will create the conversation
            await _chatService.EnsureConversationAsync(taskGuid, clientId, actualFreelancerId);

            _logger.LogInformation("Conversation validated/created");

            // Generate deterministic conversation ID
            var convId = DeterministicGuid(taskGuid, clientId, actualFreelancerId);

            _logger.LogInformation("Generated convId: {ConvId}", convId);

            // Send the message
            var message = await _chatService.ProcessAndSaveAsync(
                senderUserId, convId, content);

            _logger.LogInformation("Message saved: {MessageId}", message.MessageId);

            if (message.Blocked)
            {
                await Clients.Caller.SendAsync("MessageBlocked",
                    "Your message was blocked — contact information is not allowed.");
                return;
            }

            // Broadcast to conversation group
            await Clients.Group($"conv:{convId}")
                .SendAsync("ReceiveMessage", message);
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "SendFirstMessage: Unauthorized - {Message}", ex.Message);
            await Clients.Caller.SendAsync("Error", ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "SendFirstMessage: Not found - {Message}", ex.Message);
            await Clients.Caller.SendAsync("Error", ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "SendFirstMessage: Invalid operation - {Message}", ex.Message);
            await Clients.Caller.SendAsync("Error", ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SendFirstMessage failed - {Message}", ex.Message);
            await Clients.Caller.SendAsync("Error", ex.Message);
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