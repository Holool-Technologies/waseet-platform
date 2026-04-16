namespace Application.Features.Tasks.DTOs;

public record EscrowResponse(
    Guid EscrowId,
    Guid TaskId,
    decimal AmountUSD,
    int Status,
    string StatusLabel,
    DateTime HeldAt,
    DateTime? ReleasedAt,
    Guid? ReleasedToUserId
);