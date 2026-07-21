using Domain.Entities;
using Domain.Enums;

namespace Waseet.Domain.Entities;

/// <summary>
/// Computed statistics for a freelancer — refreshed after every
/// completed or failed delivery. Stored so public profile reads
/// are instant (no heavy aggregation query on every page load).
/// </summary>
public class FreelancerStats
{
    public Guid UserId { get; set; }

    // ── Skill level ──────────────────────────────────────────────
    public SkillLevel SkillLevel { get; set; } = SkillLevel.Newcomer;

    // ── Core counters ────────────────────────────────────────────
    public int TasksCompleted { get; set; } = 0;
    public int TasksAwarded { get; set; } = 0;
    public int TotalDisputes { get; set; } = 0;
    public int DisputesLost { get; set; } = 0;
    public int RevisionsRequested { get; set; } = 0;
    public int OnTimeDeliveries { get; set; } = 0;
    public int EarlyDeliveries { get; set; } = 0;   // delivered 2+ days early

    // ── Derived metrics ──────────────────────────────────────────
    public decimal SuccessRate { get; set; } = 0;       // 0-100
    public decimal AvgDeliveryDays { get; set; } = 0;
    public decimal TotalEarningsUSD { get; set; } = 0;
    public int SkillsCount { get; set; } = 0;
    public int UniqueClientsCount { get; set; } = 0;
    public int RepeatClientsCount { get; set; } = 0;    // clients with 2+ tasks
    public int ConsecutiveOnTime { get; set; } = 0;     // current streak

    // ── Dates ────────────────────────────────────────────────────
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastActiveAt { get; set; } = DateTime.UtcNow;
    public DateTime ComputedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}