using Application.Features.Chat.DTOs;
using Application.Features.Chat.Interfaces;
using Domain.Entities;
using Domain.Interfaces;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;


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
}