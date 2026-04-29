using Domain.Entities;

namespace Domain.Entities;

public class FreelancerProfile
{
    public Guid ProfileId { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Bio { get; set; } = string.Empty;
    public string BioOriginal { get; set; } = string.Empty; // pre-AI version
    public string Title { get; set; } = string.Empty;
    public string Skills { get; set; } = "[]"; // JSON array
    public decimal Balance { get; set; } = 0;
    public bool IsPublished { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public ICollection<PortfolioItem> PortfolioItems { get; set; } = [];
}