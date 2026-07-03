using Application.Features.Delivery.DTOs;

namespace Application.Features.Delivery.Interfaces;

public interface IAuditLogService
{
    Task LogAsync(
        string entityType,
        Guid entityId,
        string eventType,
        string actorType,
        Guid? actorUserId = null,
        object? payload = null,
        CancellationToken ct = default);

    Task<IEnumerable<AuditLogResponse>> GetLogsAsync(
        string entityType,
        Guid entityId,
        CancellationToken ct = default);
}