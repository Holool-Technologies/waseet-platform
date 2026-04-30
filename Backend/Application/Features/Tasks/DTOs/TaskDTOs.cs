public record CreateTaskRequest(
    string Title,
    string Description,
    decimal BudgetUSD,
    int Category = 0
);

public record TaskResponse(
    Guid TaskId,
    string PublicTaskCode,
    Guid ClientUserId,
    Guid? FreelancerUserId,
    string Title,
    string Description,
    decimal BudgetUSD,
    int Status,
    string StatusLabel,
    int Category,
    string CategoryLabel,
    int ProposalCount,
    string ApprovalStatus,      // NEW
    string RejectionReason,     // NEW
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record TaskListRequest(
    int Page = 1,
    int PageSize = 12,
    string? Search = null,
    decimal? MinBudget = null,
    decimal? MaxBudget = null,
    int? Status = null,
    int? Category = null,
    string SortBy = "newest"  // newest | oldest | budget_asc | budget_desc
);

public record PagedResult<T>(
    IEnumerable<T> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages
);