namespace Application.Features.Chat.DTOs;

public record ChatMessageResponse(
    Guid MessageId,
    Guid TaskId,
    string SenderRole,    // "Client" or "Freelancer" — never real identity
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