using Application.Features.Notifications.DTOs;
using Application.Features.Notifications.Interfaces;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Hubs;
namespace Infrastructure.Services;

public class NotificationService : INotificationService
{
    private readonly WaseetDbContext _db;
    private readonly IHubContext<WaseetHub> _hub;

    public NotificationService(WaseetDbContext db, IHubContext<WaseetHub> hub)
    {
        _db = db;
        _hub = hub;
    }

    public async Task CreateAndPushAsync(
        Guid userId,
        NotificationType type,
        string titleEn, string titleAr,
        string bodyEn, string bodyAr,
        string? relatedId = null,
        string? relatedUrl = null,
        CancellationToken ct = default)
    {
        var notification = new Notification
        {
            UserId = userId,
            Type = type.ToString(),
            TitleEn = titleEn,
            TitleAr = titleAr,
            BodyEn = bodyEn,
            BodyAr = bodyAr,
            RelatedId = relatedId,
            RelatedUrl = relatedUrl
        };

        _db.Notifications.Add(notification);
        await _db.SaveChangesAsync(ct);

        // Push real-time via SignalR to the user's personal group
        var unread = await GetUnreadCountAsync(userId, ct);
        await _hub.Clients.Group($"user:{userId}")
            .SendAsync("ReceiveNotification", new
            {
                notification.NotificationId,
                notification.Type,
                TitleEn = notification.TitleEn,
                TitleAr = notification.TitleAr,
                BodyEn = notification.BodyEn,
                BodyAr = notification.BodyAr,
                RelatedUrl = notification.RelatedUrl,
                notification.IsRead,
                notification.CreatedAt,
                UnreadCount = unread
            }, ct);
    }

    public async Task<IEnumerable<NotificationResponse>> GetForUserAsync(
        Guid userId, string lang, int page, int pageSize, CancellationToken ct = default)
    {
        bool isAr = lang == "ar";
        return await _db.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(n => new NotificationResponse(
                n.NotificationId,
                n.Type,
                isAr ? n.TitleAr : n.TitleEn,
                isAr ? n.BodyAr : n.BodyEn,
                n.RelatedUrl,
                n.IsRead,
                n.CreatedAt))
            .ToListAsync(ct);
    }

    public async Task<int> GetUnreadCountAsync(Guid userId, CancellationToken ct = default)
        => await _db.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead, ct);

    public async Task MarkReadAsync(Guid notificationId, Guid userId, CancellationToken ct = default)
    {
        var n = await _db.Notifications
            .FirstOrDefaultAsync(n => n.NotificationId == notificationId && n.UserId == userId, ct);
        if (n is null) return;
        n.IsRead = true;
        await _db.SaveChangesAsync(ct);
    }

    public async Task MarkAllReadAsync(Guid userId, CancellationToken ct = default)
    {
        await _db.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true), ct);
    }
}