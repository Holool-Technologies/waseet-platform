using Application.Features.Chat.DTOs;

namespace Application.Features.Chat.Interfaces;

public interface IChatService
{
    Task<ChatMessageResponse> ProcessAndSaveAsync(
        Guid senderUserId,
        Guid taskId,
        string rawContent,
        CancellationToken ct = default);

    Task<IEnumerable<ChatMessageResponse>> GetHistoryAsync(
        Guid taskId,
        Guid requestingUserId,
        int page = 1,
        int pageSize = 50,
        CancellationToken ct = default);

    Task<IEnumerable<ConversationResponse>> GetInboxAsync(Guid userId, CancellationToken ct = default);
    Task EnsureConversationAsync(Guid taskId, Guid clientId, Guid freelancerId, CancellationToken ct = default);
}