namespace Application.Features.Tasks.DTOs;

public record CreateTaskRequest(
    string Title,
    string Description,
    decimal BudgetUSD
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
    int ProposalCount,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record TaskListRequest(
    int Page = 1,
    int PageSize = 12,
    string? Search = null,
    decimal? MinBudget = null,
    decimal? MaxBudget = null,
    int? Status = null
);

public record PagedResult<T>(
    IEnumerable<T> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages
);