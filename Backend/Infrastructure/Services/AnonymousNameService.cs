using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services;

public class AnonymousNameService
{
    private readonly WaseetDbContext _db;

    public AnonymousNameService(WaseetDbContext db) => _db = db;

    /// <summary>
    /// Returns "Bidder-1", "Bidder-2" etc. for a freelancer on a specific task.
    /// The same freelancer always gets the same number on the same task.
    /// The client sees their own role as "Client".
    /// </summary>
    public async Task<string> GetAliasAsync(
        Guid taskId,
        Guid viewerUserId,
        Guid subjectUserId,
        CancellationToken ct = default)
    {
        var task = await _db.Tasks.AsNoTracking()
            .FirstOrDefaultAsync(t => t.TaskId == taskId, ct);

        if (task is null) return "Unknown";

        // Client sees themselves as "Client"
        if (subjectUserId == task.ClientUserId) return "Client";

        // Get all proposals for this task ordered by submission time
        // to give consistent sequential numbers
        var proposals = await _db.Proposals
            .AsNoTracking()
            .Where(p => p.TaskId == taskId)
            .OrderBy(p => p.SubmittedAt)
            .Select(p => p.FreelancerUserId)
            .ToListAsync(ct);

        var index = proposals.IndexOf(subjectUserId);
        if (index < 0) return "Bidder-?";

        return $"Bidder-{index + 1}";
    }

    /// <summary>
    /// Returns a dictionary mapping each freelancer userId → alias for a task.
    /// Used to bulk-map all proposals at once.
    /// </summary>
    public async Task<Dictionary<Guid, string>> GetAliasMapAsync(
        Guid taskId,
        CancellationToken ct = default)
    {
        var proposals = await _db.Proposals
            .AsNoTracking()
            .Where(p => p.TaskId == taskId)
            .OrderBy(p => p.SubmittedAt)
            .Select(p => p.FreelancerUserId)
            .ToListAsync(ct);

        return proposals
            .Select((userId, i) => new { userId, alias = $"Bidder-{i + 1}" })
            .ToDictionary(x => x.userId, x => x.alias);
    }
}