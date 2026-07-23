using Application.Features.Notifications.Interfaces;
using Application.Features.Profile.DTOs;
using Domain.Entities;
using Domain.Enums;
using Domain.Interfaces;
using Infrastructure.Persistence;
using Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using Waseet.Domain.Entities;
using Waseet.Domain.Services;
using Task = System.Threading.Tasks.Task;

namespace Infrastructure.Services;

public class ProfileService
{
    private readonly WaseetDbContext _db;
    private readonly IFileStorageService _storage;
    private readonly IVisionService _vision;
    private readonly BioFilterService _bioFilter;
    private readonly INotificationService _notifications;

    public ProfileService(
        WaseetDbContext db,
        IFileStorageService storage,
        IVisionService vision,
        BioFilterService bioFilter,
        INotificationService notifications)
    {
        _db = db;
        _storage = storage;
        _vision = vision;
        _bioFilter = bioFilter;
        _notifications = notifications;
    }

    public async Task<FreelancerProfileResponse> GetOrCreateAsync(
        Guid userId, CancellationToken ct = default)
    {
        var profile = await _db.FreelancerProfiles
            .Include(p => p.PortfolioItems)
            .FirstOrDefaultAsync(p => p.UserId == userId, ct);

        if (profile is null)
        {
            profile = new FreelancerProfile { UserId = userId };
            _db.FreelancerProfiles.Add(profile);
            await _db.SaveChangesAsync(ct);
        }

        return MapProfile(profile, includeAll: true);
    }

    public async Task<PublicProfileResponse> GetPublicAsync(
        Guid userId, CancellationToken ct = default)
    {
        var profile = await _db.FreelancerProfiles
            .Include(p => p.PortfolioItems
                .Where(i => i.Status == PortfolioStatus.Approved))
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == userId, ct)
            ?? throw new KeyNotFoundException("Profile not found.");

        // Load stats
        var stats = await _db.FreelancerStats
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.UserId == userId, ct);

        // Load badges
        var badges = await _db.FreelancerBadges
            .AsNoTracking()
            .Where(b => b.UserId == userId)
            .ToListAsync(ct);

        var skills = string.IsNullOrWhiteSpace(profile.Skills)
            ? Array.Empty<string>()
            : System.Text.Json.JsonSerializer
                .Deserialize<string[]>(profile.Skills) ?? [];

        return new PublicProfileResponse(
            profile.UserId,
            profile.Title,
            profile.Bio,
            skills,
            profile.IsPublished,
            MapStats(stats, badges),
            profile.PortfolioItems.Select(MapPortfolioItem)
        );
    }

    private static FreelancerStatsResponse MapStats(
        FreelancerStats? stats,
        List<FreelancerBadge> badges)
    {
        if (stats is null)
        {
            var newcomerInfo = SkillLevelCalculator.GetInfo(SkillLevel.Newcomer);
            return new FreelancerStatsResponse(
                0, 0, 0, 0, "$0",
                0, 0,
                new SkillLevelInfo("Newcomer",
                    newcomerInfo.Label, newcomerInfo.LabelAr,
                    newcomerInfo.Emoji, newcomerInfo.Color,
                    0, 3, 0),
                []);
        }

        var levelInfo = SkillLevelCalculator.GetInfo(stats.SkillLevel);
        var nextLevel = (SkillLevel)Math.Min((int)stats.SkillLevel + 1, 5);
        var nextInfo = SkillLevelCalculator.GetInfo(nextLevel);

        // Progress toward next level (based on tasks completed)
        var currentMin = levelInfo.MinCompleted;
        var nextMin = nextInfo.MinCompleted;
        var progress = nextMin > currentMin
            ? Math.Min(100,
                (decimal)(stats.TasksCompleted - currentMin)
                / (nextMin - currentMin) * 100)
            : 100;

        // Earnings range (privacy-friendly: show range not exact)
        var earningsRange = stats.TotalEarningsUSD switch
        {
            < 100 => "$0 – $100",
            < 500 => "$100 – $500",
            < 1000 => "$500 – $1K",
            < 5000 => "$1K – $5K",
            < 10000 => "$5K – $10K",
            < 50000 => "$10K – $50K",
            _ => "$50K+"
        };

        return new FreelancerStatsResponse(
            stats.TasksCompleted,
            stats.TasksAwarded,
            stats.SuccessRate,
            stats.AvgDeliveryDays,
            earningsRange,
            stats.UniqueClientsCount,
            stats.SkillsCount,
            new SkillLevelInfo(
                stats.SkillLevel.ToString(),
                levelInfo.Label, levelInfo.LabelAr,
                levelInfo.Emoji, levelInfo.Color,
                (int)stats.SkillLevel,
                nextMin,
                Math.Round(progress, 1)
            ),
            badges.Select(b =>
            {
                var def = BadgeCalculator.Definitions[b.Type];
                return new BadgeInfo(
                    b.Type.ToString(),
                    def.Label, def.LabelAr,
                    def.Emoji, def.Description, def.DescriptionAr,
                    b.EarnedAt);
            })
        );
    }

    public async Task<BioPreviewResponse> PreviewBioAsync(
        string rawBio, CancellationToken ct = default)
    {
        var result = await _bioFilter.FilterAsync(rawBio, ct);
        return new BioPreviewResponse(rawBio, result.FilteredBio, result.WasModified);
    }

    public async Task<FreelancerProfileResponse> UpdateBioAsync(
        Guid userId, UpdateBioRequest request, CancellationToken ct = default)
    {
        var profile = await GetProfileEntityAsync(userId, ct);

        var bioResult = await _bioFilter.FilterAsync(request.Bio, ct);
        profile.BioOriginal = request.Bio;
        profile.Bio = bioResult.FilteredBio;
        profile.Title = request.Title.Trim();
        profile.Skills = JsonSerializer.Serialize(request.Skills);
        profile.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        return MapProfile(profile, includeAll: true);
    }

    public async Task<PortfolioUploadResponse> UploadPortfolioImageAsync(
        Guid userId,
        Stream imageStream,
        string fileName,
        string contentType,
        string caption,
        CancellationToken ct = default)
    {
        var profile = await GetProfileEntityAsync(userId, ct);

        // Limit portfolio size
        var count = await _db.PortfolioItems
            .CountAsync(i => i.ProfileId == profile.ProfileId, ct);
        if (count >= 20)
            throw new InvalidOperationException("Portfolio limit reached (20 images).");

        // Validate image type
        var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp" };
        var ext = Path.GetExtension(fileName).ToLower();
        if (!allowed.Contains(ext))
            throw new InvalidOperationException("Only JPG, PNG, and WebP images are allowed.");

        // Copy stream for vision analysis (stream can only be read once)
        using var ms = new MemoryStream();
        await imageStream.CopyToAsync(ms, ct);
        ms.Position = 0;

        // Azure Computer Vision — detect humans
        var vision = await _vision.AnalyzeImageAsync(ms, ct);
        ms.Position = 0;

        if (vision.HumanDetected)
        {
            // Auto-reject — do not store
            return new PortfolioUploadResponse(
                Guid.Empty, string.Empty, "Rejected",
                true,
                "Image rejected: human figures detected. Portfolio images must not contain people.");
        }

        // Upload to storage
        var blobRef = await _storage.UploadAsync(ms, fileName, contentType, folder: "portfolio", ct);
        var imageUrl = $"/{blobRef}";

        var item = new PortfolioItem
        {
            ProfileId = profile.ProfileId,
            ImageUrl = imageUrl,
            BlobRef = blobRef,
            Caption = caption.Trim(),
            Status = PortfolioStatus.Pending
        };

        _db.PortfolioItems.Add(item);
        await _db.SaveChangesAsync(ct);

        return new PortfolioUploadResponse(
            item.ItemId, item.ImageUrl, "Pending",
            false,
            "Image uploaded and queued for admin review.");
    }

    public async Task AdminReviewPortfolioAsync(
        Guid itemId, Guid adminId, string decision, string notes,
        CancellationToken ct = default)
    {
        var item = await _db.PortfolioItems
            .Include(i => i.Profile)
            .FirstOrDefaultAsync(i => i.ItemId == itemId, ct)
            ?? throw new KeyNotFoundException("Portfolio item not found.");

        item.Status = decision == "approve"
            ? PortfolioStatus.Approved
            : PortfolioStatus.Rejected;
        item.AdminNotes = notes;
        item.ReviewedByAdminId = adminId;
        item.ReviewedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        // Notify freelancer
        if (item.Status == PortfolioStatus.Approved)
        {
            await _notifications.CreateAndPushAsync(
                item.Profile.UserId,
                NotificationType.PortfolioApproved,
                "Portfolio Image Approved",
                "تمت الموافقة على صورة المحفظة",
                "Your portfolio image has been approved and is now visible on your public profile.",
                "تمت الموافقة على صورتك وأصبحت مرئية في ملفك الشخصي.",
                item.ItemId.ToString(),
                "/profile",
                ct);
        }
        else
        {
            await _notifications.CreateAndPushAsync(
                item.Profile.UserId,
                NotificationType.PortfolioRejected,
                "Portfolio Image Rejected",
                "تم رفض صورة المحفظة",
                $"Your portfolio image was rejected. Reason: {notes}",
                $"تم رفض صورتك. السبب: {notes}",
                item.ItemId.ToString(),
                "/profile",
                ct);
        }
    }

    public async Task<IEnumerable<AdminPortfolioItem>> GetPendingPortfolioAsync(
        CancellationToken ct = default)
    {
        return await _db.PortfolioItems
            .Include(i => i.Profile)
            .AsNoTracking()
            .Where(i => i.Status == PortfolioStatus.Pending)
            .OrderBy(i => i.UploadedAt)
            .Select(i => new AdminPortfolioItem(
                i.ItemId, i.ProfileId, i.Profile.UserId,
                i.ImageUrl, i.Caption, i.HumanDetected, i.UploadedAt))
            .ToListAsync(ct);
    }

    private async Task<FreelancerProfile> GetProfileEntityAsync(
        Guid userId, CancellationToken ct)
    {
        var profile = await _db.FreelancerProfiles
            .Include(p => p.PortfolioItems)
            .FirstOrDefaultAsync(p => p.UserId == userId, ct);

        if (profile is null)
        {
            profile = new FreelancerProfile { UserId = userId };
            _db.FreelancerProfiles.Add(profile);
            await _db.SaveChangesAsync(ct);
        }

        return profile;
    }

    private static FreelancerProfileResponse MapProfile(
        FreelancerProfile p, bool includeAll)
    {
        var items = p.PortfolioItems
            .Where(i => includeAll || i.Status == PortfolioStatus.Approved)
            .Select(i => new PortfolioItemResponse(
                i.ItemId, i.ImageUrl, i.Caption,
                i.Status.ToString(), i.AdminNotes, i.UploadedAt));

        var skills = string.IsNullOrWhiteSpace(p.Skills)
            ? []
            : System.Text.Json.JsonSerializer.Deserialize<string[]>(p.Skills) ?? [];

        return new FreelancerProfileResponse(
            p.UserId, p.Title, p.Bio, skills,
            p.Balance, p.IsPublished, items);
    }

    private static PortfolioItemResponse MapPortfolioItem(PortfolioItem i)
    {
        return new PortfolioItemResponse(
            i.ItemId,
            i.ImageUrl,
            i.Caption,
            i.Status.ToString(),
            i.AdminNotes,
            i.UploadedAt
        );
    }
}