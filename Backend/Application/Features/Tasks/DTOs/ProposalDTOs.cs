namespace Application.Features.Tasks.DTOs;

public record CreateProposalRequest(
    string CoverLetter,
    decimal BidAmount
);

public record ProposalResponse(
    Guid ProposalId,
    Guid TaskId,
    Guid FreelancerUserId,
    string CoverLetter,
    decimal BidAmount,
    int Status,
    string StatusLabel,
    bool WasRewritten,      // NEW
    DateTime SubmittedAt
);