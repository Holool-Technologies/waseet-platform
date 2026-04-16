using Microsoft.AspNetCore.Http;

namespace Application.Features.Kyc.DTOs;

public record KycSubmitRequest(
    string FullName,
    IFormFile Document
);

public record KycStatusResponse(
    Guid KycId,
    string Status,
    DateTime SubmittedAt,
    DateTime? VerifiedAt
);

public record KycAdminListItem(
    Guid KycId,
    Guid UserId,
    string Status,
    DateTime SubmittedAt,
    string DocumentBlobRef
);

public record KycDecisionRequest(
    string Decision  // "approve" or "reject"
);