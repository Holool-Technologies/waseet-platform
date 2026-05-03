namespace Application.Features.Chat.DTOs;

public record ChatMessageResponse(
    Guid MessageId,
    Guid TaskId,
    Guid ConversationId,    // NEW
    Guid SenderUserId,      // needed for isMine()
    string SenderRole,
    string SanitizedContent,
    bool PiiDetected,
    bool Blocked,
    DateTime SentAt
);

public record ConversationResponse(
    Guid ConversationId,
    Guid TaskId,
    string TaskCode,
    string TaskTitle,
    string OtherPartyAlias,
    string LastMessage,
    DateTime LastMessageAt,
    int UnreadCount
);

public record SendMessageRequest(Guid ConversationId, string Content);
public record OpenConversationRequest(Guid TaskId, Guid FreelancerUserId);
public record OpenConversationResponse(
    Guid ConversationId, Guid TaskId,
    string TaskCode, string OtherPartyAlias);