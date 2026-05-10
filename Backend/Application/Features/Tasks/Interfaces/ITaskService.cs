using Application.Features.Tasks.DTOs;


namespace Application.Features.Tasks.Interfaces;

public interface ITaskService
{
    Task<TaskResponse> CreateAsync(Guid clientUserId, CreateTaskRequest request, CancellationToken ct = default);
    Task<PagedResult<TaskResponse>> BrowseAsync(TaskListRequest request, CancellationToken ct = default);
    Task<TaskResponse> GetByCodeAsync(string code, Guid? requestingUserId = null, CancellationToken ct = default);
    Task<IEnumerable<TaskResponse>> GetMineAsync(Guid userId, CancellationToken ct = default);

    Task<ProposalResponse> SubmitProposalAsync(Guid freelancerUserId, string taskCode, CreateProposalRequest request, CancellationToken ct = default);
    Task<IEnumerable<ProposalResponse>> GetProposalsAsync(Guid clientUserId, string taskCode,bool isClient, CancellationToken ct = default);
    Task<TaskResponse> AwardProposalAsync(Guid clientUserId, string taskCode, Guid proposalId, CancellationToken ct = default);

    Task<EscrowResponse> GetEscrowAsync(string taskCode, CancellationToken ct = default);
    Task<EscrowResponse> ReleaseEscrowAsync(Guid clientUserId, Guid escrowId, CancellationToken ct = default);
    Task<EscrowResponse> DisputeEscrowAsync(Guid userId, Guid escrowId, CancellationToken ct = default);
    Task<TaskResponse> AdminApproveTaskAsync(Guid taskId, CancellationToken ct = default);
    Task<TaskResponse> AdminRejectTaskAsync(Guid taskId, string reason, CancellationToken ct = default);
    Task<PagedResult<TaskResponse>> GetPendingApprovalAsync(int page, int pageSize, CancellationToken ct = default);
}