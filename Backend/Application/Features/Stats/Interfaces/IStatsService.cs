namespace Waseet.Application.Features.Stats.Interfaces;

public interface IStatsService
{
    /// <summary>
    /// Recompute and persist stats + badges for a freelancer.
    /// Called after every delivery accepted/auto-released/disputed.
    /// </summary>
    Task RecomputeFreelancerAsync(
        Guid userId, CancellationToken ct = default);

    /// <summary>Recompute stats for a client after every task resolved.</summary>
    Task RecomputeClientAsync(
        Guid userId, CancellationToken ct = default);
}