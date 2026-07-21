using Domain.Entities;
using Domain.Enums;
namespace Waseet.Domain.Entities;


public class FreelancerBadge
{
    public Guid BadgeId { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public BadgeType Type { get; set; }
    public DateTime EarnedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}