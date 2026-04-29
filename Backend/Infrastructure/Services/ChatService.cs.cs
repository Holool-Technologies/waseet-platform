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
        Guid senderUserId,
        Guid taskId,
        string rawContent,
        CancellationToken ct = default)
    {
        // Verify sender is a party to this task
        var task = await _db.Tasks
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.TaskId == taskId, ct)
            ?? throw new KeyNotFoundException("Task not found.");

        var isParty = task.ClientUserId == senderUserId
                   || task.FreelancerUserId == senderUserId;
        if (!isParty)
            throw new UnauthorizedAccessException("You are not a party to this task.");

        // Determine sender role — never expose real identity
        var senderRole = task.ClientUserId == senderUserId ? "Client" : "Freelancer";

        // Sanitize through AI pipeline
        var sanitized = await _sanitizer.SanitizeAsync(rawContent, ct);

        // Encrypt original message at rest
        var encryptedOriginal = _encryption.Encrypt(rawContent);

        var aiFlags = JsonSerializer.Serialize(new
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
            SanitizedContent = sanitized.Blocked
                ? "[Message blocked]"
                : sanitized.SanitizedContent,
            AiFlags = aiFlags
        };

        _db.ChatMessages.Add(message);
        await _db.SaveChangesAsync(ct);

        task = await _db.Tasks.FindAsync([taskId], ct);
        if (task is not null)
        {
            var conv = await _db.ChatConversations
                .FirstOrDefaultAsync(c => c.TaskId == taskId, ct);

            if (conv is not null)
            {
                conv.LastMessage = sanitized.SanitizedContent[..Math.Min(100, sanitized.SanitizedContent.Length)];
                conv.LastMessageAt = DateTime.UtcNow;

                if (task.ClientUserId == senderUserId)
                    conv.FreelancerUnreadCount++;
                else
                    conv.ClientUnreadCount++;

                await _db.SaveChangesAsync(ct);
            }
        }
        return new ChatMessageResponse(
            message.MessageId,
            message.TaskId,
            senderRole,
            message.SanitizedContent,
            sanitized.PiiDetected,
            sanitized.Blocked,
            message.SentAt
        );
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
                task.ClientUserId == m.SenderUserId ? "Client" : "Freelancer",
                m.SanitizedContent,
                m.AiFlags.Contains("\"pii_detected\":true"),
                m.AiFlags.Contains("\"blocked\":true"),
                m.SentAt
            ))
            .ToListAsync(ct);
    }
    public async Task<IEnumerable<ConversationResponse>> GetInboxAsync(
    Guid userId, CancellationToken ct = default)
    {
        return await _db.ChatConversations
            .Include(c => c.Task)
            .AsNoTracking()
            .Where(c => c.ClientUserId == userId || c.FreelancerUserId == userId)
            .OrderByDescending(c => c.LastMessageAt)
            .Select(c => new ConversationResponse(
                c.ConversationId,
                c.TaskId,
                c.Task.PublicTaskCode,
                c.Task.Title,
                c.ClientUserId == userId ? "Freelancer" : "Client",
                c.LastMessage,
                c.LastMessageAt,
                c.ClientUserId == userId ? c.ClientUnreadCount : c.FreelancerUnreadCount
            ))
            .ToListAsync(ct);
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