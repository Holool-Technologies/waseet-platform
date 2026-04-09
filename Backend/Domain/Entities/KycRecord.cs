using Domain.Enums;

namespace Domain.Entities;

public class KycRecord
{
    public Guid KycId { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public byte[] FullNameEncrypted { get; set; } = [];
    public string DocumentBlobRef { get; set; } = string.Empty;
    public KycStatus Status { get; set; } = KycStatus.Pending;
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    public DateTime? VerifiedAt { get; set; }

    public User User { get; set; } = null!;
}