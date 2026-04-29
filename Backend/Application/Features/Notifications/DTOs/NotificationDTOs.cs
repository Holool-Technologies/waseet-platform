namespace Application.Features.Notifications.DTOs;

public record NotificationResponse(
    Guid NotificationId,
    string Type,
    string Title,
    string Body,
    string? RelatedUrl,
    bool IsRead,
    DateTime CreatedAt
);

public record NotificationCountResponse(int UnreadCount);