using Domain.Entities;
using Domain.Enums;

namespace Domain.Entities;

public class PortfolioItem
{
    public Guid ItemId { get; set; } = Guid.NewGuid();
    public Guid ProfileId { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public string BlobRef { get; set; } = string.Empty;
    public string Caption { get; set; } = string.Empty;
    public PortfolioStatus Status { get; set; } = PortfolioStatus.Pending;
    public bool HumanDetected { get; set; } = false;
    public string AdminNotes { get; set; } = string.Empty;
    public Guid? ReviewedByAdminId { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReviewedAt { get; set; }

    public FreelancerProfile Profile { get; set; } = null!;
}