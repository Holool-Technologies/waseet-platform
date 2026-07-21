using Domain.Enums;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Waseet.Application.Features.Stats.Interfaces;
using Waseet.Domain.Entities;
using Waseet.Domain.Services;
using Waseet.Infrastructure.Persistence;
using TaskStatus = Domain.Enums.TaskStatus;

namespace Waseet.Infrastructure.Services;

public class StatsService : IStatsService
{
    private readonly WaseetDbContext _db;
    private readonly ILogger<StatsService> _logger;

    public StatsService(WaseetDbContext db, ILogger<StatsService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task RecomputeFreelancerAsync(
        Guid userId, CancellationToken ct = default)
    {
        try
        {
            // ── Gather raw data ───────────────────────────────────────────────
            var tasks = await _db.Tasks
                .AsNoTracking()
                .Where(t => t.FreelancerUserId == userId)
                .ToListAsync(ct);

            var deliveries = await _db.Deliveries
                .AsNoTracking()
                .Where(d => d.FreelancerUserId == userId)
                .ToListAsync(ct);

            var profile = await _db.FreelancerProfiles
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.UserId == userId, ct);

            var user = await _db.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.UserId == userId, ct);

            // ── Compute metrics ───────────────────────────────────────────────
            var completed = deliveries.Count(d =>
                d.Status == DeliveryStatus.Accepted ||
                d.Status == DeliveryStatus.AutoReleased);

            var awarded = tasks.Count;
            var disputes = await _db.Disputes
                .CountAsync(d => tasks.Select(t => t.TaskId).Contains(d.TaskId), ct);

            var disputesLost = await _db.Disputes
                .CountAsync(d => d.Resolution == DisputeResolution.FavorClient
                    && tasks.Select(t => t.TaskId).Contains(d.TaskId), ct);

            var successRate = awarded > 0
                ? Math.Round((decimal)completed / awarded * 100, 1)
                : 0;

            // On-time and early deliveries
            var acceptedDeliveries = deliveries.Where(d =>
                d.Status == DeliveryStatus.Accepted ||
                d.Status == DeliveryStatus.AutoReleased).ToList();

            var onTime = acceptedDeliveries.Count(d =>
                d.RespondedAt.HasValue &&
                d.RespondedAt <= d.ReviewDeadline);

            var earlyDeliveries = acceptedDeliveries.Count(d =>
                d.RespondedAt.HasValue &&
                d.ReviewDeadline - d.RespondedAt.Value >= TimeSpan.FromDays(2));

            var avgDeliveryDays = acceptedDeliveries.Any()
                ? (decimal)acceptedDeliveries
                    .Where(d => d.RespondedAt.HasValue)
                    .Select(d => (d.RespondedAt!.Value - d.SubmittedAt).TotalDays)
                    .DefaultIfEmpty(0)
                    .Average()
                : 0;

            var totalEarnings = await _db.EscrowTransactions
                .AsNoTracking()
                .Where(e => e.Status == EscrowStatus.Released
                         && tasks.Select(t => t.TaskId)
                                 .Contains(e.TaskId))
                .SumAsync(e => e.AmountUSD, ct);

            // Unique and repeat clients
            var clientIds = tasks.Select(t => t.ClientUserId).ToList();
            var uniqueClients = clientIds.Distinct().Count();
            var repeatClients = clientIds
                .GroupBy(id => id)
                .Count(g => g.Count() >= 2);

            // Skills count from profile
            var skillsJson = profile?.Skills ?? "[]";
            var skillsCount = 0;
            try
            {
                var skills = System.Text.Json.JsonSerializer
                    .Deserialize<string[]>(skillsJson);
                skillsCount = skills?.Length ?? 0;
            }
            catch { }

            // Consecutive on-time streak (last N deliveries all on time)
            var orderedDeliveries = acceptedDeliveries
                .OrderByDescending(d => d.SubmittedAt).ToList();
            var streak = 0;
            foreach (var d in orderedDeliveries)
            {
                if (d.RespondedAt.HasValue &&
                    d.RespondedAt <= d.ReviewDeadline)
                    streak++;
                else
                    break;
            }

            // ── Build or update stats row ─────────────────────────────────────
            var stats = await _db.FreelancerStats
                .FirstOrDefaultAsync(s => s.UserId == userId, ct);

            if (stats is null)
            {
                stats = new FreelancerStats
                {
                    UserId = userId,
                    JoinedAt = user?.CreatedAt ?? DateTime.UtcNow
                };
                _db.FreelancerStats.Add(stats);
            }

            stats.TasksCompleted = completed;
            stats.TasksAwarded = awarded;
            stats.TotalDisputes = disputes;
            stats.DisputesLost = disputesLost;
            stats.OnTimeDeliveries = onTime;
            stats.EarlyDeliveries = earlyDeliveries;
            stats.SuccessRate = successRate;
            stats.AvgDeliveryDays = (decimal)Math.Round(avgDeliveryDays, 1);
            stats.TotalEarningsUSD = totalEarnings;
            stats.SkillsCount = skillsCount;
            stats.UniqueClientsCount = uniqueClients;
            stats.RepeatClientsCount = repeatClients;
            stats.ConsecutiveOnTime = streak;
            stats.LastActiveAt = DateTime.UtcNow;
            stats.ComputedAt = DateTime.UtcNow;

            // Compute skill level from pure domain logic
            stats.SkillLevel = SkillLevelCalculator.Calculate(
                completed, successRate);

            await _db.SaveChangesAsync(ct);

            // ── Sync badges ───────────────────────────────────────────────────
            await SyncFreelancerBadgesAsync(userId, stats, ct);

            _logger.LogInformation(
                "Recomputed stats for freelancer {UserId}: " +
                "Level={Level}, Completed={Completed}, Rate={Rate}%",
                userId, stats.SkillLevel, completed, successRate);
        }
        catch (Exception ex)
        {
            // Never let stats failure break the delivery flow
            _logger.LogError(ex,
                "Failed to recompute stats for freelancer {UserId}", userId);
        }
    }

    public async Task RecomputeClientAsync(
        Guid userId, CancellationToken ct = default)
    {
        try
        {
            var tasks = await _db.Tasks
                .AsNoTracking()
                .Where(t => t.ClientUserId == userId)
                .ToListAsync(ct);

            var taskIds = tasks.Select(t => t.TaskId).ToList();
            var completed = tasks.Count(t => t.Status == TaskStatus.Completed);
            var disputesOpened = await _db.Disputes
                .CountAsync(d => d.RaisedByUserId == userId, ct);
            var disputesWon = await _db.Disputes
                .CountAsync(d => d.RaisedByUserId == userId
                    && d.Resolution == DisputeResolution.FavorClient, ct);

            // Avg days to release escrow
            var releases = await _db.EscrowTransactions
                .AsNoTracking()
                .Where(e => taskIds.Contains(e.TaskId)
                         && e.Status == EscrowStatus.Released)
                .ToListAsync(ct);

            // For now avg = placeholder since we don't store release date separately
            var avgPaymentDays = 1.5m; // TODO: store ReleasedAt on EscrowTransaction

            var clientStats = await _db.ClientStats
                .FirstOrDefaultAsync(s => s.UserId == userId, ct);

            if (clientStats is null)
            {
                clientStats = new ClientStats { UserId = userId };
                _db.ClientStats.Add(clientStats);
            }

            clientStats.TasksPosted = tasks.Count;
            clientStats.TasksCompleted = completed;
            clientStats.DisputesOpened = disputesOpened;
            clientStats.DisputesWon = disputesWon;
            clientStats.AvgPaymentDays = avgPaymentDays;
            clientStats.ComputedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);

            await SyncClientBadgesAsync(userId, clientStats, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Failed to recompute client stats for {UserId}", userId);
        }
    }

    // ── Private: badge sync ───────────────────────────────────────────────────

    private async Task SyncFreelancerBadgesAsync(
        Guid userId, FreelancerStats stats, CancellationToken ct)
    {
        var earned = BadgeCalculator
            .ComputeEarnedBadges(stats).ToHashSet();

        var existing = await _db.FreelancerBadges
            .Where(b => b.UserId == userId)
            .ToListAsync(ct);

        var existingTypes = existing.Select(b => b.Type).ToHashSet();

        // Add new badges
        foreach (var type in earned.Except(existingTypes))
        {
            _db.FreelancerBadges.Add(new FreelancerBadge
            {
                UserId = userId,
                Type = type
            });
            _logger.LogInformation(
                "Freelancer {UserId} earned badge {Badge}", userId, type);
        }

        // Note: badges are never removed once earned

        await _db.SaveChangesAsync(ct);
    }

    private async Task SyncClientBadgesAsync(
        Guid userId, ClientStats stats, CancellationToken ct)
    {
        var earned = BadgeCalculator
            .ComputeClientBadges(stats).ToHashSet();

        var existing = await _db.FreelancerBadges
            .Where(b => b.UserId == userId)
            .Select(b => b.Type)
            .ToHashSetAsync(ct);

        foreach (var type in earned.Except(existing))
        {
            _db.FreelancerBadges.Add(new FreelancerBadge
            {
                UserId = userId,
                Type = type
            });
        }

        await _db.SaveChangesAsync(ct);
    }
}