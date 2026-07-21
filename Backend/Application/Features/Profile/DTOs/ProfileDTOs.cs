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


public record SkillLevelInfo(
    string Key,
    string Label,
    string LabelAr,
    string Emoji,
    string Color,
    int Level,
    int NextLevelAt,
    decimal Progress
);

public record BadgeInfo(
    string Type,
    string Label,
    string LabelAr,
    string Emoji,
    string Description,
    string DescriptionAr,
    DateTime EarnedAt
);

public record FreelancerStatsResponse(
    int TasksCompleted,
    int TasksAwarded,
    decimal SuccessRate,
    decimal AvgDeliveryDays,
    string EarningsRange,
    int UniqueClientsCount,
    int SkillsCount,
    SkillLevelInfo SkillLevel,
    IEnumerable<BadgeInfo> Badges
);

public record PublicProfileResponse(
    Guid UserId,
    string Title,
    string Bio,
    string[] Skills,
    bool IsPublished,
    FreelancerStatsResponse Stats,
    IEnumerable<PortfolioItemResponse> Portfolio
);