namespace Application.Features.Chat.DTOs;

public record ChatMessageResponse(
    Guid MessageId,
    Guid TaskId,
    Guid SenderUserId,     // ← ADD THIS — needed for client-side isMine()
    string SenderRole,
    string SanitizedContent,
    bool PiiDetected,
    bool Blocked,
    DateTime SentAt
);

public record SendMessageRequest(
    Guid TaskId,
    string Content
);

public record ConversationResponse(
    Guid ConversationId,
    Guid TaskId,
    string TaskCode,
    string TaskTitle,
    string OtherPartyRole,
    string LastMessage,
    DateTime LastMessageAt,
    int UnreadCount
);

public record OpenConversationRequest(Guid TaskId, Guid FreelancerUserId);