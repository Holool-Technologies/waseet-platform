using Domain.Enums;
namespace Domain.Entities;

public class Proposal
{
    public Guid ProposalId { get; set; } = Guid.NewGuid();
    public Guid TaskId { get; set; }
    public Guid FreelancerUserId { get; set; }
    public string CoverLetter { get; set; } = string.Empty;
    public decimal BidAmount { get; set; }
    public ProposalStatus Status { get; set; } = ProposalStatus.Pending;
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

    public WaseetTask Task { get; set; } = null!;
}