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

    /// <summary>
    /// Opens or retrieves an existing conversation between client and a specific bidder.
    /// Does NOT create if it already exists.
    /// </summary>
    public async Task<OpenConversationResponse> OpenConversationAsync(
        Guid clientUserId,
        Guid taskId,
        Guid freelancerUserId,
        CancellationToken ct = default)
    {
        // Verify the freelancer has actually bid on this task
        var task = await _db.Tasks
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.TaskId == taskId, ct)
            ?? throw new KeyNotFoundException("Task not found.");

        if (task.ClientUserId != clientUserId)
            throw new UnauthorizedAccessException("Only the task client can open conversations.");

        bool hasBid = await _db.Proposals
            .AnyAsync(p => p.TaskId == taskId
                        && p.FreelancerUserId == freelancerUserId, ct);

        if (!hasBid && task.FreelancerUserId != freelancerUserId)
            throw new InvalidOperationException("Can only message bidders on this task.");

        // Find existing or prepare to create lazily
        var existing = await _db.ChatConversations
            .AsNoTracking()
            .FirstOrDefaultAsync(c =>
                c.TaskId == taskId &&
                c.ClientUserId == clientUserId &&
                c.FreelancerUserId == freelancerUserId, ct);

        // Get anonymous alias
        var proposals = await _db.Proposals
            .AsNoTracking()
            .Where(p => p.TaskId == taskId)
            .OrderBy(p => p.SubmittedAt)
            .Select(p => p.FreelancerUserId)
            .ToListAsync(ct);

        var idx = proposals.IndexOf(freelancerUserId);
        var alias = idx >= 0 ? $"Bidder-{idx + 1}" : "Freelancer";

        var convId = existing?.ConversationId ?? Guid.NewGuid();

        if (existing is null)
        {
            // Store pending ConversationId in memory — created on first message
            // Return the ID so frontend can open the chat room
            // We use a deterministic ID so we don't create orphaned rows
            convId = DeterministicGuid(taskId, clientUserId, freelancerUserId);
        }

        return new OpenConversationResponse(
            convId, taskId, task.PublicTaskCode, alias);
    }

    /// <summary>
    /// Creates conversation row on first message (lazy creation).
    /// </summary>
    public async Task<ChatMessageResponse> ProcessAndSaveAsync(
        Guid senderUserId,
        Guid conversationId,
        string rawContent,
        CancellationToken ct = default)
    {
        // Try to find existing conversation
        var conv = await _db.ChatConversations
            .Include(c => c.Task)
            .FirstOrDefaultAsync(c => c.ConversationId == conversationId, ct);

        if (conv is null)
        {
            // Conversation doesn't exist yet — this is the first message
            // We need to reconstruct from the deterministic ID
            // The frontend must pass taskId + freelancerId for first message
            throw new KeyNotFoundException(
                "Conversation not found. It may not have been initialized.");
        }

        // Verify sender is client or the specific freelancer of THIS conversation
        bool isClient = conv.ClientUserId == senderUserId;
        bool isFreelancer = conv.FreelancerUserId == senderUserId;

        if (!isClient && !isFreelancer)
            throw new UnauthorizedAccessException(
                "You are not a party to this conversation.");

        var senderRole = isClient ? "Client" : "Freelancer";

        var sanitized = await _sanitizer.SanitizeAsync(rawContent, ct);
        var encryptedOriginal = _encryption.Encrypt(rawContent);

        var aiFlags = JsonSerializer.Serialize(new
        {
            pii_detected = sanitized.PiiDetected,
            blocked = sanitized.Blocked,
            reason = sanitized.Reason
        });

        var message = new ChatMessage
        {
            TaskId = conv.TaskId,
            ConversationId = conversationId,   // scope to conversation
            SenderUserId = senderUserId,
            OriginalEncrypted = encryptedOriginal,
            SanitizedContent = sanitized.Blocked
                ? "[Message blocked]"
                : sanitized.SanitizedContent,
            AiFlags = aiFlags
        };

        _db.ChatMessages.Add(message);

        // Update conversation last message + unread
        conv.LastMessage = message.SanitizedContent[..Math.Min(100, message.SanitizedContent.Length)];
        conv.LastMessageAt = DateTime.UtcNow;
        conv.HasMessages = true;

        if (isClient) conv.FreelancerUnreadCount++;
        else conv.ClientUnreadCount++;

        await _db.SaveChangesAsync(ct);

        return new ChatMessageResponse(
            message.MessageId,
            conv.TaskId,
            conversationId,
            message.SenderUserId,
            senderRole,
            message.SanitizedContent,
            sanitized.PiiDetected,
            sanitized.Blocked,
            message.SentAt);
    }

    /// <summary>
    /// Creates conversation lazily on first message.
    /// </summary>
    //public async Task<ChatMessageResponse> ProcessFirstMessageAsync(
    //    Guid senderUserId,
    //    Guid taskId,
    //    Guid freelancerUserId,
    //    string rawContent,
    //    CancellationToken ct = default)
    //{
    //    var task = await _db.Tasks
    //        .AsNoTracking()
    //        .FirstOrDefaultAsync(t => t.TaskId == taskId, ct)
    //        ?? throw new KeyNotFoundException("Task not found.");

    //    // Determine roles
    //    Guid clientId, flId;
    //    if (task.ClientUserId == senderUserId)
    //    {
    //        clientId = senderUserId;
    //        flId = freelancerUserId;
    //    }
    //    else
    //    {
    //        clientId = task.ClientUserId;
    //        flId = senderUserId;
    //    }

    //    // Create conversation if not exists
    //    var convId = DeterministicGuid(taskId, clientId, flId);
    //    var conv = await _db.ChatConversations
    //        .FirstOrDefaultAsync(c => c.ConversationId == convId, ct);

    //    if (conv is null)
    //    {
    //        conv = new ChatConversation
    //        {
    //            ConversationId = convId,
    //            TaskId = taskId,
    //            ClientUserId = clientId,
    //            FreelancerUserId = flId,
    //            HasMessages = false
    //        };
    //        _db.ChatConversations.Add(conv);
    //        await _db.SaveChangesAsync(ct);
    //    }

    //    return await ProcessAndSaveAsync(senderUserId, convId, rawContent, ct);
    //}

    /// <summary>
    /// Get message history scoped to ONE conversation (client + specific bidder).
    /// Fix 9: check conversation party, not task party.
    /// </summary>
    public async Task<IEnumerable<ChatMessageResponse>> GetHistoryAsync(
        Guid conversationId,
        Guid requestingUserId,
        int page = 1,
        int pageSize = 50,
        CancellationToken ct = default)
    {
        var conv = await _db.ChatConversations
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.ConversationId == conversationId, ct)
            ?? throw new KeyNotFoundException("Conversation not found.");

        // Fix 9: check THIS conversation's parties
        bool isParty = conv.ClientUserId == requestingUserId
                    || conv.FreelancerUserId == requestingUserId;

        if (!isParty)
            throw new UnauthorizedAccessException(
                "You are not a party to this conversation.");

        return await _db.ChatMessages
            .AsNoTracking()
            .Where(m => m.ConversationId == conversationId)  // scoped!
            .OrderBy(m => m.SentAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(m => new ChatMessageResponse(
                m.MessageId,
                m.TaskId,
                conversationId,
                m.SenderUserId,
                conv.ClientUserId == m.SenderUserId ? "Client" : "Freelancer",
                m.SanitizedContent,
                m.AiFlags.Contains("\"pii_detected\":true"),
                m.AiFlags.Contains("\"blocked\":true"),
                m.SentAt))
            .ToListAsync(ct);
    }

    /// <summary>
    /// Inbox — only shows conversations that have at least one message.
    /// Fix 7: no empty conversations in sidebar.
    /// </summary>
    public async Task<IEnumerable<ConversationResponse>> GetInboxAsync(
        Guid userId,
        CancellationToken ct = default)
    {
        var convs = await _db.ChatConversations
            .Include(c => c.Task)
            .AsNoTracking()
            .Where(c =>
                (c.ClientUserId == userId || c.FreelancerUserId == userId)
                && c.HasMessages)  // Fix 7: only show if has messages
            .OrderByDescending(c => c.LastMessageAt)
            .ToListAsync(ct);

        var result = new List<ConversationResponse>();

        foreach (var c in convs)
        {
            var isClient = c.ClientUserId == userId;
            var otherUserId = isClient ? c.FreelancerUserId : c.ClientUserId;

            string alias;
            if (isClient)
            {
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
                alias = "Client";
            }

            result.Add(new ConversationResponse(
                c.ConversationId, c.TaskId,
                c.Task.PublicTaskCode,
                c.Task.Title,
                alias,
                c.LastMessage,
                c.LastMessageAt,
                isClient ? c.ClientUnreadCount : c.FreelancerUnreadCount));
        }

        return result;
    }

    public async Task EnsureConversationAsync(
        Guid taskId, Guid clientId,
        Guid freelancerId, CancellationToken ct = default)
    {
        // Just validate — don't create until first message
        var task = await _db.Tasks.AsNoTracking()
            .FirstOrDefaultAsync(t => t.TaskId == taskId, ct)
            ?? throw new KeyNotFoundException("Task not found.");

        if (task.ClientUserId != clientId)
            throw new UnauthorizedAccessException("Only the client can initiate conversations.");

        bool hasBid = await _db.Proposals
            .AnyAsync(p => p.TaskId == taskId
                        && p.FreelancerUserId == freelancerId, ct);

        if (!hasBid && task.FreelancerUserId != freelancerId)
            throw new InvalidOperationException("Freelancer has not bid on this task.");
    }
    /// <summary>
    /// Resets the unread counter for the given user in a conversation.
    /// Called when the user opens and reads the conversation.
    /// Persists to DB so refresh does not restore the count.
    /// </summary>
    public async Task MarkConversationReadAsync(
        Guid conversationId,
        Guid userId,
        CancellationToken ct = default)
    {
        var conv = await _db.ChatConversations
            .FirstOrDefaultAsync(c => c.ConversationId == conversationId, ct);

        if (conv is null) return;

        bool isClient = conv.ClientUserId == userId;
        bool isFreelancer = conv.FreelancerUserId == userId;

        if (!isClient && !isFreelancer) return; // not a party — ignore silently

        if (isClient && conv.ClientUnreadCount == 0) return; // already zero
        if (isFreelancer && conv.FreelancerUnreadCount == 0) return; // already zero

        if (isClient)
            conv.ClientUnreadCount = 0;
        else
            conv.FreelancerUnreadCount = 0;

        await _db.SaveChangesAsync(ct);
    }
    // Deterministic GUID from three GUIDs — same input always produces same output
    private static Guid DeterministicGuid(Guid taskId, Guid clientId, Guid freelancerId)
    {
        var combined = $"{taskId}:{clientId}:{freelancerId}";
        using var md5 = System.Security.Cryptography.MD5.Create();
        var hash = md5.ComputeHash(System.Text.Encoding.UTF8.GetBytes(combined));
        return new Guid(hash);
    }
}