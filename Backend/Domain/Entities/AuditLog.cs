namespace Domain.Entities;

public class AuditLog
{
    public Guid LogId { get; set; } = Guid.NewGuid();
    public string EntityType { get; set; } = string.Empty;  // "Delivery", "Dispute" etc
    public Guid EntityId { get; set; }
    public string EventType { get; set; } = string.Empty;   // "DeliverySubmitted" etc
    public Guid? ActorUserId { get; set; }                  // null = System
    public string ActorType { get; set; } = string.Empty;   // "Freelancer","Client","Admin","System"
    public string Payload { get; set; } = "{}";             // JSON snapshot
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
}