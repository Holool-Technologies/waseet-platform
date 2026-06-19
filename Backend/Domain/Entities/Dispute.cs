using Domain.Entities;
using Domain.Enums;
using Task = Domain.Entities.Task;

namespace Waseet.Domain.Entities;

public class Dispute
{
    public Guid DisputeId { get; set; } = Guid.NewGuid();
    public Guid DeliveryId { get; set; }
    public Guid TaskId { get; set; }
    public Guid RaisedByUserId { get; set; }     // always the client
    public string Report { get; set; } = string.Empty;
    public DisputeStatus Status { get; set; } = DisputeStatus.Open;
    public Guid? ResolvedByAdminId { get; set; }
    public string AdminNotes { get; set; } = string.Empty;
    public DisputeResolution? Resolution { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }

    public Delivery Delivery { get; set; } = null!;
    public Task Task { get; set; } = null!;
}