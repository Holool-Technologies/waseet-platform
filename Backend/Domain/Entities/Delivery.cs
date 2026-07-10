using Domain.Enums;

namespace Domain.Entities;

public class Delivery
{
    public Guid DeliveryId { get; set; } = Guid.NewGuid();
    public Guid TaskId { get; set; }
    public Guid FreelancerUserId { get; set; }
    public int RevisionNumber { get; set; } = 0;   // 0 = initial, 1+ = revisions
    public string Note { get; set; } = string.Empty;
    public DeliveryStatus Status { get; set; } = DeliveryStatus.AwaitingReview;
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    public DateTime ReviewDeadline { get; set; }
    public DateTime? RespondedAt { get; set; }

    public Task Task { get; set; } = null!;
    public ICollection<DeliveryFile> Files { get; set; } = [];
    public string? VideoUrl { get; set; }                     // NEW
    public string Links { get; set; } = "[]";                 // NEW — JSON array of {label, url}
    public string Checklist { get; set; } = "[]";             // NEW — JSON array of {item, done}
    public int ProgressPercent { get; set; } = 100;           // NEW — 0-100
    public ICollection<RevisionRequest> RevisionRequests { get; set; } = [];
}