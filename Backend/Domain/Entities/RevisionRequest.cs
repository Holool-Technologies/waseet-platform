using Domain.Enums;

namespace Domain.Entities;

public class RevisionRequest
{
    public Guid RevisionId { get; set; } = Guid.NewGuid();
    public Guid DeliveryId { get; set; }       // the delivery being revised
    public Guid TaskId { get; set; }
    public Guid RequestedByUserId { get; set; } // always the client
    public string Reason { get; set; } = string.Empty;
    public RevisionStatus Status { get; set; } = RevisionStatus.Open;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }

    public Delivery Delivery { get; set; } = null!;
    public Task Task { get; set; } = null!;
}