using Application.Features.Admin.DTOs;

namespace Application.Features.Admin.Interfaces;

public interface IAdminService
{
    Task<DashboardStatsResponse> GetStatsAsync(CancellationToken ct = default);

    Task<AdminPagedResult<AdminUserResponse>> GetUsersAsync(int page, int pageSize, string? search, string? role, CancellationToken ct = default);
    Task BanUserAsync(Guid userId, bool ban, CancellationToken ct = default);
    Task DeleteUserAsync(Guid userId, CancellationToken ct = default);

    Task<AdminPagedResult<AdminKycResponse>> GetKycQueueAsync(int page, int pageSize, string? status, CancellationToken ct = default);
    Task DecideKycAsync(Guid kycId, string decision, CancellationToken ct = default);

    Task<AdminPagedResult<AdminTaskResponse>> GetTasksAsync(int page, int pageSize, string? search, string? status, CancellationToken ct = default);
    Task DeleteTaskAsync(Guid taskId, CancellationToken ct = default);

    Task<AdminPagedResult<AdminEscrowResponse>> GetEscrowsAsync(int page, int pageSize, string? status, CancellationToken ct = default);
    Task ResolveDisputeAsync(Guid escrowId, string resolution, CancellationToken ct = default);

    Task<AdminPagedResult<AdminChatMessageResponse>> GetChatLogsAsync(int page, int pageSize, bool blockedOnly, CancellationToken ct = default);
}