using Domain.Enums;

namespace Domain.Entities;

public class User
{
    public Guid UserId { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = string.Empty; // AES-256 encrypted at infra layer
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public KycStatus KycStatus { get; set; } = KycStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public KycRecord? KycRecord { get; set; }

    public ICollection<RefreshToken> RefreshTokens { get; set; } = [];
}