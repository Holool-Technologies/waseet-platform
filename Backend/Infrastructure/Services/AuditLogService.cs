using Application.Features.Delivery.DTOs;
using Application.Features.Delivery.Interfaces;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using Task=System.Threading.Tasks.Task;


namespace Infrastructure.Services;

public class AuditLogService : IAuditLogService
{
    private readonly WaseetDbContext _db;

    public AuditLogService(WaseetDbContext db) => _db = db;

    public async Task LogAsync(
        string entityType, Guid entityId,
        string eventType, string actorType,
        Guid? actorUserId = null,
        object? payload = null,
        CancellationToken ct = default)
    {
        var log = new AuditLog
        {
            EntityType = entityType,
            EntityId = entityId,
            EventType = eventType,
            ActorType = actorType,
            ActorUserId = actorUserId,
            Payload = payload is null
                ? "{}"
                : JsonSerializer.Serialize(payload)
        };

        _db.AuditLogs.Add(log);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<IEnumerable<AuditLogResponse>> GetLogsAsync(
        string entityType, Guid entityId, CancellationToken ct = default)
    {
        return await _db.AuditLogs
            .AsNoTracking()
            .Where(a => a.EntityType == entityType && a.EntityId == entityId)
            .OrderBy(a => a.OccurredAt)
            .Select(a => new AuditLogResponse(
                a.LogId, a.EventType, a.ActorType, a.Payload, a.OccurredAt))
            .ToListAsync(ct);
    }
}