using Domain.Entities;
using Domain.Enums;
using Task = Domain.Entities.Task;

namespace Waseet.Domain.Entities;

public class Delivery
{
    public Guid DeliveryId { get; set; } = Guid.NewGuid();
    public Guid TaskId { get; set; }
    public Guid FreelancerUserId { get; set; }
    public string Note { get; set; } = string.Empty;
    public DeliveryStatus Status { get; set; } = DeliveryStatus.AwaitingReview;
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    public DateTime ReviewDeadline { get; set; }   // auto-release trigger date
    public DateTime? RespondedAt { get; set; }

    public Task Task { get; set; } = null!;
    public ICollection<DeliveryFile> Files { get; set; } = [];
}