namespace Application.Features.Profile.DTOs;

public record UpdateBioRequest(string Bio, string Title, string[] Skills);

public record BioPreviewResponse(string Original, string Filtered, bool WasModified);

public record PortfolioUploadResponse(
    Guid ItemId, string ImageUrl, string Status,
    bool HumanDetected, string Message);

public record PortfolioItemResponse(
    Guid ItemId, string ImageUrl, string Caption,
    string Status, string AdminNotes, DateTime UploadedAt);

public record FreelancerProfileResponse(
    Guid UserId, string Title, string Bio,
    string[] Skills, decimal Balance, bool IsPublished,
    IEnumerable<PortfolioItemResponse> Portfolio);

public record AdminPortfolioReviewRequest(string Decision, string AdminNotes);

public record AdminPortfolioItem(
    Guid ItemId, Guid ProfileId, Guid UserId,
    string ImageUrl, string Caption,
    bool HumanDetected, DateTime UploadedAt);