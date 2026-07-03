using Domain.Entities;
using Domain.Enums;

namespace Domain.Entities;

public class Dispute
{
    public Guid DisputeId { get; set; } = Guid.NewGuid();
    public Guid DeliveryId { get; set; }
    public Guid TaskId { get; set; }
    public Guid RaisedByUserId { get; set; }
    public string Report { get; set; } = string.Empty;
    public DisputeStatus Status { get; set; } = DisputeStatus.Open;
    public Guid? ClaimedByAdminId { get; set; }
    public DateTime? ClaimedAt { get; set; }
    public Guid? ResolvedByAdminId { get; set; }
    public string AdminNotes { get; set; } = string.Empty;
    public DisputeResolution? Resolution { get; set; }

    // Partial payment support — ready for future without schema change
    public decimal? FreelancerAmount { get; set; }   // null = full amount
    public decimal? ClientRefundAmount { get; set; }  // null = full amount

    public byte[] RowVersion { get; set; } = [];     // optimistic concurrency
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }

    public Delivery Delivery { get; set; } = null!;
    public Task Task { get; set; } = null!;
}