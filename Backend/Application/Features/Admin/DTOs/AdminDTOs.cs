namespace Application.Features.Admin.DTOs;

public record DashboardStatsResponse(
    int TotalUsers,
    int TotalClients,
    int TotalFreelancers,
    int PendingKyc,
    int TotalTasks,
    int OpenTasks,
    int ActiveTasks,
    int CompletedTasks,
    int DisputedTasks,
    int TotalMessages,
    int BlockedMessages,
    decimal TotalEscrowVolume,
    decimal HeldEscrowVolume,
    DateTime GeneratedAt
);

public record AdminUserResponse(
    Guid UserId,
    string Email,
    string Role,
    string KycStatus,
    int TaskCount,
    DateTime CreatedAt,
    bool IsBanned
);

public record AdminTaskResponse(
    Guid TaskId,
    string PublicTaskCode,
    string Title,
    string CategoryLabel,
    decimal BudgetUSD,
    string Status,
    int ProposalCount,
    DateTime CreatedAt
);

public record AdminKycResponse(
    Guid KycId,
    Guid UserId,
    string UserEmail,
    string Status,
    string DocumentBlobRef,
    DateTime SubmittedAt,
    DateTime? VerifiedAt
);

public record AdminEscrowResponse(
    Guid EscrowId,
    string TaskCode,
    decimal AmountUSD,
    string Status,
    DateTime HeldAt,
    DateTime? ReleasedAt
);

public record AdminChatMessageResponse(
    Guid MessageId,
    string TaskCode,
    string SenderRole,
    string SanitizedContent,
    bool PiiDetected,
    bool Blocked,
    string AiFlags,
    DateTime SentAt
);

public record AdminPagedResult<T>(
    IEnumerable<T> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages
);

public record BanUserRequest(bool Ban);
public record AdminDecideKycRequest(string Decision);
public record AdminResolveDisputeRequest(string Resolution); // "release" or "refund"