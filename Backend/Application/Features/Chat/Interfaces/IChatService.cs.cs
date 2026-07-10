using Application.Features.Chat.DTOs;

namespace Application.Features.Chat.Interfaces;

public interface IChatService
{
    Task<OpenConversationResponse> OpenConversationAsync(
        Guid clientUserId, Guid taskId, Guid freelancerUserId,
        CancellationToken ct = default);

    Task<ChatMessageResponse> ProcessAndSaveAsync(
        Guid senderUserId, Guid conversationId, string rawContent,
        CancellationToken ct = default);

    Task<ChatMessageResponse> ProcessFirstMessageAsync(
        Guid senderUserId, Guid taskId, Guid freelancerUserId,
        string rawContent, CancellationToken ct = default);

    Task<IEnumerable<ChatMessageResponse>> GetHistoryAsync(
        Guid conversationId, Guid requestingUserId,
        int page, int pageSize, CancellationToken ct = default);

    Task<IEnumerable<ConversationResponse>> GetInboxAsync(
        Guid userId, CancellationToken ct = default);

    Task<int> GetTotalUnreadCountAsync(
        Guid userId, CancellationToken ct = default);

    Task EnsureConversationAsync(
        Guid taskId, Guid clientId, Guid freelancerId,
        CancellationToken ct = default);
    Task MarkConversationReadAsync(
    Guid conversationId,
    Guid userId,
    CancellationToken ct = default);
}