using Application.Features.Notifications.DTOs;
using Domain.Enums;

namespace Application.Features.Notifications.Interfaces;

public interface INotificationService
{
    Task CreateAndPushAsync(
        Guid userId,
        NotificationType type,
        string titleEn, string titleAr,
        string bodyEn, string bodyAr,
        string? relatedId = null,
        string? relatedUrl = null,
        CancellationToken ct = default);

    Task<IEnumerable<NotificationResponse>> GetForUserAsync(
        Guid userId, string lang, int page, int pageSize, CancellationToken ct = default);

    Task<int> GetUnreadCountAsync(Guid userId, CancellationToken ct = default);
    Task MarkReadAsync(Guid notificationId, Guid userId, CancellationToken ct = default);
    Task MarkAllReadAsync(Guid userId, CancellationToken ct = default);
}