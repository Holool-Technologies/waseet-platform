using Domain.Enums;
namespace Domain.Entities;

public class EscrowTransaction
{
    public Guid EscrowId { get; set; } = Guid.NewGuid();
    public Guid TaskId { get; set; }
    public decimal AmountUSD { get; set; }
    public EscrowStatus Status { get; set; } = EscrowStatus.Held;
    public DateTime HeldAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReleasedAt { get; set; }
    public Guid? ReleasedToUserId { get; set; }

    public WaseetTask Task { get; set; } = null!;
}