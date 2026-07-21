using Domain.Entities;

namespace Waseet.Domain.Entities;

/// <summary>Client-side stats — used for client badges on their profile.</summary>
public class ClientStats
{
    public Guid UserId { get; set; }
    public int TasksPosted { get; set; } = 0;
    public int TasksCompleted { get; set; } = 0;
    public int TotalPaidUSD { get; set; } = 0;
    public int DisputesOpened { get; set; } = 0;
    public int DisputesWon { get; set; } = 0;
    public decimal AvgPaymentDays { get; set; } = 0;  // escrow release speed
    public DateTime ComputedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}