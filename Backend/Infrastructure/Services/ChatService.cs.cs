using Application.Features.Chat.DTOs;
using Application.Features.Chat.Interfaces;
using Domain.Entities;
using Domain.Interfaces;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using Task=System.Threading.Tasks.Task;

namespace Infrastructure.Services;

public class ChatService : IChatService
{
    private readonly WaseetDbContext _db;
    private readonly IAiSanitizerService _sanitizer;
    private readonly EncryptionService _encryption;

    public ChatService(
        WaseetDbContext db,
        IAiSanitizerService sanitizer,
        EncryptionService encryption)
    {
        _db = db;
        _sanitizer = sanitizer;
        _encryption = encryption;
    }

    public async Task<ChatMessageResponse> ProcessAndSaveAsync(
        Guid senderUserId, Guid taskId,
        string rawContent, CancellationToken ct = default)
    {
        var task = await _db.Tasks
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.TaskId == taskId, ct)
            ?? throw new KeyNotFoundException("Task not found.");

        // Check sender is client OR any bidder on this task
        bool isClient = task.ClientUserId == senderUserId;
        bool isFreelancer = task.FreelancerUserId == senderUserId;
        bool isBidder = await _db.Proposals
            .AnyAsync(p => p.TaskId == taskId
                        && p.FreelancerUserId == senderUserId, ct);

        if (!isClient && !isFreelancer && !isBidder)
            throw new UnauthorizedAccessException("You are not a party to this task.");

        var senderRole = isClient ? "Client" : "Freelancer";

        var sanitized = await _sanitizer.SanitizeAsync(rawContent, ct);
        var encryptedOriginal = _encryption.Encrypt(rawContent);

        var aiFlags = System.Text.Json.JsonSerializer.Serialize(new
        {
            pii_detected = sanitized.PiiDetected,
            blocked = sanitized.Blocked,
            reason = sanitized.Reason
        });

        var message = new ChatMessage
        {
            TaskId = taskId,
            SenderUserId = senderUserId,
            OriginalEncrypted = encryptedOriginal,
            SanitizedContent = sanitized.Blocked ? "[Message blocked]" : sanitized.SanitizedContent,
            AiFlags = aiFlags
        };

        _db.ChatMessages.Add(message);

        // Update or create conversation
        var conv = await _db.ChatConversations
            .FirstOrDefaultAsync(c => c.TaskId == taskId
                && ((c.ClientUserId == task.ClientUserId && c.FreelancerUserId == senderUserId)
                 || (c.ClientUserId == senderUserId && c.FreelancerUserId == task.ClientUserId)
                 || (c.FreelancerUserId == senderUserId)), ct);

        if (conv is null && isBidder)
        {
            conv = new ChatConversation
            {
                TaskId = taskId,
                ClientUserId = task.ClientUserId,
                FreelancerUserId = senderUserId
            };
            _db.ChatConversations.Add(conv);
        }

        if (conv is not null)
        {
            conv.LastMessage = sanitized.SanitizedContent[..Math.Min(100, sanitized.SanitizedContent.Length)];
            conv.LastMessageAt = DateTime.UtcNow;
            if (isClient) conv.FreelancerUnreadCount++;
            else conv.ClientUnreadCount++;
        }

        await _db.SaveChangesAsync(ct);

        return new ChatMessageResponse(
        message.MessageId,
        message.TaskId,
        message.SenderUserId,   // ← ADD
        senderRole,
        message.SanitizedContent,
        sanitized.PiiDetected,
        sanitized.Blocked,
        message.SentAt);
    }

    public async Task<IEnumerable<ChatMessageResponse>> GetHistoryAsync(
        Guid taskId,
        Guid requestingUserId,
        int page = 1,
        int pageSize = 50,
        CancellationToken ct = default)
    {
        var task = await _db.Tasks
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.TaskId == taskId, ct)
            ?? throw new KeyNotFoundException("Task not found.");

        var isParty = task.ClientUserId == requestingUserId
                   || task.FreelancerUserId == requestingUserId;
        if (!isParty)
            throw new UnauthorizedAccessException("Not authorized to view this chat.");

        return await _db.ChatMessages
            .AsNoTracking()
            .Where(m => m.TaskId == taskId)
            .OrderBy(m => m.SentAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(m => new ChatMessageResponse(
                m.MessageId,
                m.TaskId,
                m.SenderUserId,         // ← ADD
                task.ClientUserId == m.SenderUserId ? "Client" : "Freelancer",
                m.SanitizedContent,
                m.AiFlags.Contains("\"pii_detected\":true"),
                m.AiFlags.Contains("\"blocked\":true"),
                m.SentAt))
            .ToListAsync(ct);
    }
    public async Task<IEnumerable<ConversationResponse>> GetInboxAsync(
        Guid userId, CancellationToken ct = default)
    {
        var convs = await _db.ChatConversations
            .Include(c => c.Task)
            .AsNoTracking()
            .Where(c => c.ClientUserId == userId || c.FreelancerUserId == userId)
            .OrderByDescending(c => c.LastMessageAt)
            .ToListAsync(ct);

        var result = new List<ConversationResponse>();

        foreach (var c in convs)
        {
            // Determine the other party
            var otherUserId = c.ClientUserId == userId
                ? c.FreelancerUserId
                : c.ClientUserId;

            // Get anonymous alias
            string alias;
            if (c.ClientUserId == userId)
            {
                // Viewer is client — show bidder alias
                var proposals = await _db.Proposals
                    .AsNoTracking()
                    .Where(p => p.TaskId == c.TaskId)
                    .OrderBy(p => p.SubmittedAt)
                    .Select(p => p.FreelancerUserId)
                    .ToListAsync(ct);
                var idx = proposals.IndexOf(otherUserId);
                alias = idx >= 0 ? $"Bidder-{idx + 1}" : "Bidder";
            }
            else
            {
                // Viewer is freelancer — other party is always "Client"
                alias = "Client";
            }

            var unread = c.ClientUserId == userId
                ? c.ClientUnreadCount
                : c.FreelancerUnreadCount;

            result.Add(new ConversationResponse(
                c.ConversationId, c.TaskId,
                c.Task.PublicTaskCode,
                c.Task.Title,
                alias,
                c.LastMessage,
                c.LastMessageAt,
                unread));
        }

        return result;
    }

    public async Task EnsureConversationAsync(
        Guid taskId, Guid clientId, Guid freelancerId, CancellationToken ct = default)
    {
        var exists = await _db.ChatConversations
            .AnyAsync(c => c.TaskId == taskId
                        && c.ClientUserId == clientId
                        && c.FreelancerUserId == freelancerId, ct);

        if (!exists)
        {
            _db.ChatConversations.Add(new ChatConversation
            {
                TaskId = taskId,
                ClientUserId = clientId,
                FreelancerUserId = freelancerId
            });
            await _db.SaveChangesAsync(ct);
        }
    }
}