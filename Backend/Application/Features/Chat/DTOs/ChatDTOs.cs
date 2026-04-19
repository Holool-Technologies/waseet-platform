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