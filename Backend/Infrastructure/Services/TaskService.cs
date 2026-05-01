using Application.Features.Notifications.Interfaces;
using Application.Features.Tasks.DTOs;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Waseet.Application.Features.Tasks.Interfaces;
using Task = Domain.Entities.Task;
using TaskStatus = Domain.Enums.TaskStatus;

namespace Infrastructure.Services;

public class TaskService : ITaskService
{
    private readonly WaseetDbContext _db;
    private readonly TaskCodeGenerator _codeGen;
    private readonly INotificationService _notifications;
    public TaskService(WaseetDbContext db, TaskCodeGenerator codeGen ,INotificationService notifications)
    {
        _db = db;
        _codeGen = codeGen;
        _notifications = notifications;
    }

    public async Task<TaskResponse> CreateAsync(
        Guid clientUserId,
        CreateTaskRequest request,
        CancellationToken ct = default)
    {
        var user = await _db.Users.FindAsync(new object[] { clientUserId }, ct)
            ?? throw new KeyNotFoundException("User not found.");

        if (user.KycStatus != KycStatus.Approved)
            throw new InvalidOperationException("KYC verification required before posting tasks.");

        var code = await _codeGen.GenerateAsync(ct);

        var task = new Task
        {
            PublicTaskCode = code,
            ClientUserId = clientUserId,
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            BudgetUSD = request.BudgetUSD,
            Category = (TaskCategory)request.Category,
            Status = TaskStatus.Open,
            ApprovalStatus = TaskApprovalStatus.PendingApproval
        };

        _db.Tasks.Add(task);
        await _db.SaveChangesAsync(ct);
        return MapTask(task, 0);
    }

    public async Task<PagedResult<TaskResponse>> BrowseAsync(
        TaskListRequest request,
        CancellationToken ct = default)
    {
        var query = _db.Tasks
            .Include(t => t.Proposals)
            .AsNoTracking()
            .AsQueryable();
        query = query.Where(t => t.ApprovalStatus == TaskApprovalStatus.Approved);
        if (!string.IsNullOrWhiteSpace(request.Search))
            query = query.Where(t =>
                t.Title.Contains(request.Search) ||
                t.Description.Contains(request.Search));

        if (request.MinBudget.HasValue)
            query = query.Where(t => t.BudgetUSD >= request.MinBudget.Value);

        if (request.MaxBudget.HasValue)
            query = query.Where(t => t.BudgetUSD <= request.MaxBudget.Value);

        if (request.Status.HasValue)
            query = query.Where(t => (int)t.Status == request.Status.Value);
        if (request.Category.HasValue)
            query = query.Where(t => (int)t.Category == request.Category.Value);
        else
            query = query.Where(t => t.Status == TaskStatus.Open
                                  || t.Status == TaskStatus.Bidding);

        var total = await query.CountAsync(ct);
	query = request.SortBy switch
	{
               "oldest"       => query.OrderBy(t => t.CreatedAt),
               "budget_asc"   => query.OrderBy(t => t.BudgetUSD),
               "budget_desc"  => query.OrderByDescending(t => t.BudgetUSD),
                _             => query.OrderByDescending(t => t.CreatedAt)
	};
        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(ct);

        return new PagedResult<TaskResponse>(
            items.Select(t => MapTask(t, t.Proposals.Count)),
            total,
            request.Page,
            request.PageSize,
            (int)Math.Ceiling(total / (double)request.PageSize)
        );
    }

    public async Task<TaskResponse> GetByCodeAsync(string code, Guid? requestingUserId = null, CancellationToken ct = default)
    {
        var task = await _db.Tasks
            .Include(t => t.Proposals)
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.PublicTaskCode == code, ct)
            ?? throw new KeyNotFoundException($"Task {code} not found.");

        var hasSubmittedProposal = false;
        if (requestingUserId is not null && requestingUserId != task.ClientUserId)
        {
            hasSubmittedProposal = await _db.Proposals
                .AsNoTracking()
                .AnyAsync(p => p.TaskId == task.TaskId && p.FreelancerUserId == requestingUserId, ct);
        }

        return MapTask(task, task.Proposals.Count);
    }

    public async Task<IEnumerable<TaskResponse>> GetMineAsync(
        Guid userId,
        CancellationToken ct = default)
    {
        return await _db.Tasks
            .Include(t => t.Proposals)
            .AsNoTracking()
            .Where(t => t.ClientUserId == userId || t.FreelancerUserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => MapTask(t, t.Proposals.Count))
            .ToListAsync(ct);
    }

    public async Task<ProposalResponse> SubmitProposalAsync(
        Guid freelancerUserId,
        string taskCode,
        CreateProposalRequest request,
        CancellationToken ct = default)
    {
        var task = await _db.Tasks
            .FirstOrDefaultAsync(t => t.PublicTaskCode == taskCode, ct)
            ?? throw new KeyNotFoundException("Task not found.");

        if (task.Status != Domain.Enums.TaskStatus.Open &&
            task.Status != Domain.Enums.TaskStatus.Bidding)
            throw new InvalidOperationException("Task is not accepting proposals.");

        if (task.ClientUserId == freelancerUserId)
            throw new InvalidOperationException("You cannot bid on your own task.");

        var alreadyBid = await _db.Proposals
            .AnyAsync(p => p.TaskId == task.TaskId
                        && p.FreelancerUserId == freelancerUserId, ct);
        if (alreadyBid)
            throw new InvalidOperationException("You have already submitted a proposal.");

        var proposal = new Proposal
        {
            TaskId = task.TaskId,
            FreelancerUserId = freelancerUserId,
            CoverLetter = request.CoverLetter.Trim(),
            BidAmount = request.BidAmount
        };

        task.Status = Domain.Enums.TaskStatus.Bidding;
        task.UpdatedAt = DateTime.UtcNow;

        _db.Proposals.Add(proposal);
        await _db.SaveChangesAsync(ct);
        return MapProposal(proposal);
    }

  public async Task<IEnumerable<ProposalResponse>> GetProposalsAsync(
    Guid requestingUserId,
    string taskCode,
    bool isClient,
    CancellationToken ct = default)
{
    var task = await _db.Tasks
        .AsNoTracking()
        .FirstOrDefaultAsync(t => t.PublicTaskCode == taskCode, ct)
        ?? throw new KeyNotFoundException("Task not found.");

    // Client sees full proposals. Freelancer sees anonymized competing bids.
    if (!isClient && task.FreelancerUserId != requestingUserId)
    {
        // Freelancer sees only bid amounts + status — no cover letters, no IDs
        return await _db.Proposals
            .AsNoTracking()
            .Where(p => p.TaskId == task.TaskId)
            .OrderByDescending(p => p.SubmittedAt)
            .Select(p => new ProposalResponse(
                Guid.Empty,           // anonymized
                p.TaskId,
                Guid.Empty,           // anonymized
                string.Empty,         // no cover letter
                p.BidAmount,
                (int)p.Status,
                p.Status.ToString(),
                p.SubmittedAt
            ))
            .ToListAsync(ct);
    }

    if (isClient && task.ClientUserId != requestingUserId)
        throw new UnauthorizedAccessException("Only the task owner can view full proposals.");

    return await _db.Proposals
        .AsNoTracking()
        .Where(p => p.TaskId == task.TaskId)
        .OrderByDescending(p => p.SubmittedAt)
        .Select(p => new ProposalResponse(
            p.ProposalId, p.TaskId, p.FreelancerUserId,
            p.CoverLetter, p.BidAmount, (int)p.Status,
            p.Status.ToString(), p.SubmittedAt))
        .ToListAsync(ct);
}

    public async Task<TaskResponse> AwardProposalAsync(
        Guid clientUserId, string taskCode,
        Guid proposalId, CancellationToken ct = default)
    {
        var task = await _db.Tasks
            .Include(t => t.Proposals)
            .FirstOrDefaultAsync(t => t.PublicTaskCode == taskCode, ct)
            ?? throw new KeyNotFoundException("Task not found.");

        if (task.ClientUserId != clientUserId)
            throw new UnauthorizedAccessException("Only the task owner can award proposals.");

        var proposal = task.Proposals.FirstOrDefault(p => p.ProposalId == proposalId)
            ?? throw new KeyNotFoundException("Proposal not found.");

        proposal.Status = Domain.Enums.ProposalStatus.Accepted;
        task.FreelancerUserId = proposal.FreelancerUserId;
        task.Status = Domain.Enums.TaskStatus.Active;
        task.UpdatedAt = DateTime.UtcNow;

        foreach (var other in task.Proposals.Where(p => p.ProposalId != proposalId))
            other.Status = Domain.Enums.ProposalStatus.Rejected;

        var escrow = new EscrowTransaction
        {
            TaskId = task.TaskId,
            AmountUSD = proposal.BidAmount,
            Status = Domain.Enums.EscrowStatus.Held
        };
        _db.EscrowTransactions.Add(escrow);
        await _db.SaveChangesAsync(ct);

        // Notify awarded freelancer
        await _notifications.CreateAndPushAsync(
            proposal.FreelancerUserId,
            Domain.Enums.NotificationType.ProposalAwarded,
            "You've been selected!",
            "تم اختيارك!",
            $"Congratulations! You have been awarded the task \"{task.Title}\". You can now start working.",
            $"تهانينا! لقد تم اختيارك للمهمة \"{task.Title}\". يمكنك البدء في العمل الآن.",
            task.TaskId.ToString(),
            $"/chat/{task.TaskId}",
            ct);

        return MapTask(task, task.Proposals.Count);
    }

    public async Task<EscrowResponse> GetEscrowAsync(string taskCode, CancellationToken ct = default)
    {
        var task = await _db.Tasks
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.PublicTaskCode == taskCode, ct)
            ?? throw new KeyNotFoundException("Task not found.");

        var escrow = await _db.EscrowTransactions
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.TaskId == task.TaskId, ct)
            ?? throw new KeyNotFoundException("No escrow for this task.");

        return MapEscrow(escrow);
    }

    public async Task<EscrowResponse> ReleaseEscrowAsync(
        Guid clientUserId,
        Guid escrowId,
        CancellationToken ct = default)
    {
        var escrow = await _db.EscrowTransactions
            .Include(e => e.Task)
            .FirstOrDefaultAsync(e => e.EscrowId == escrowId, ct)
            ?? throw new KeyNotFoundException("Escrow not found.");

        if (escrow.Task.ClientUserId != clientUserId)
            throw new UnauthorizedAccessException("Only the client can release escrow.");

        if (escrow.Status != Domain.Enums.EscrowStatus.Held)
            throw new InvalidOperationException("Escrow is not in Held status.");

        escrow.Status = Domain.Enums.EscrowStatus.Released;
        escrow.ReleasedAt = DateTime.UtcNow;
        escrow.ReleasedToUserId = escrow.Task.FreelancerUserId;
        escrow.Task.Status = Domain.Enums.TaskStatus.Completed;
        escrow.Task.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        return MapEscrow(escrow);
    }

    public async Task<EscrowResponse> DisputeEscrowAsync(
        Guid userId,
        Guid escrowId,
        CancellationToken ct = default)
    {
        var escrow = await _db.EscrowTransactions
            .Include(e => e.Task)
            .FirstOrDefaultAsync(e => e.EscrowId == escrowId, ct)
            ?? throw new KeyNotFoundException("Escrow not found.");

        var isParty = escrow.Task.ClientUserId == userId
                   || escrow.Task.FreelancerUserId == userId;
        if (!isParty)
            throw new UnauthorizedAccessException("You are not a party to this escrow.");

        if (escrow.Status != Domain.Enums.EscrowStatus.Held)
            throw new InvalidOperationException("Only Held escrow can be disputed.");

        escrow.Status = Domain.Enums.EscrowStatus.Disputed;
        escrow.Task.Status = Domain.Enums.TaskStatus.Disputed;
        escrow.Task.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        return MapEscrow(escrow);
    }

    public async Task<TaskResponse> AdminApproveTaskAsync(
        Guid taskId, CancellationToken ct = default)
    {
        var task = await _db.Tasks.FindAsync([taskId], ct)
            ?? throw new KeyNotFoundException("Task not found.");

        task.ApprovalStatus = Domain.Enums.TaskApprovalStatus.Approved;
        task.ApprovedAt = DateTime.UtcNow;
        task.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        // ✅ Notify the CLIENT who posted the task — NOT admin
        await _notifications.CreateAndPushAsync(
            task.ClientUserId,  // <-- task owner
            Domain.Enums.NotificationType.TaskApproved,
            "Task Published",
            "تم نشر مهمتك",
            $"Your task \"{task.Title}\" has been approved and is now live.",
            $"تمت الموافقة على مهمتك \"{task.Title}\" وأصبحت متاحة الآن.",
            task.TaskId.ToString(),
            $"/tasks/{task.PublicTaskCode}",
            ct);

        return MapTask(task, 0);
    }

    public async Task<TaskResponse> AdminRejectTaskAsync(
        Guid taskId, string reason, CancellationToken ct = default)
    {
        var task = await _db.Tasks.FindAsync([taskId], ct)
            ?? throw new KeyNotFoundException("Task not found.");

        task.ApprovalStatus = Domain.Enums.TaskApprovalStatus.Rejected;
        task.RejectionReason = reason;
        task.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        // ✅ Notify the CLIENT who posted — NOT admin
        await _notifications.CreateAndPushAsync(
            task.ClientUserId,  // <-- task owner
            Domain.Enums.NotificationType.TaskRejected,
            "Task Rejected",
            "تم رفض مهمتك",
            $"Your task \"{task.Title}\" was rejected. Reason: {reason}",
            $"تم رفض مهمتك \"{task.Title}\". السبب: {reason}",
            task.TaskId.ToString(),
            "/my-tasks",
            ct);
        return MapTask(task, 0);

    }

    public async Task<PagedResult<TaskResponse>> GetPendingApprovalAsync(
        int page, int pageSize, CancellationToken ct = default)
    {
        var query = _db.Tasks
            .Where(t => t.ApprovalStatus == Domain.Enums.TaskApprovalStatus.PendingApproval)
            .AsNoTracking();

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(t => t.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => MapTask(t, 0))
            .ToListAsync(ct);

        return new PagedResult<TaskResponse>(
            items, total, page, pageSize,
            (int)Math.Ceiling(total / (double)pageSize));
    }

private static TaskResponse MapTask(Task t, int proposalCount) => new(
    t.TaskId, t.PublicTaskCode, t.ClientUserId, t.FreelancerUserId,
    t.Title, t.Description, t.BudgetUSD,
    (int)t.Status, t.Status.ToString(),
    (int)t.Category, t.Category.ToString().Replace("_", " & "),
    proposalCount,
    t.ApprovalStatus.ToString(),
    t.RejectionReason,
    t.CreatedAt, t.UpdatedAt);

    private static ProposalResponse MapProposal(Proposal p) => new(
        p.ProposalId, p.TaskId, p.FreelancerUserId,
        p.CoverLetter, p.BidAmount, (int)p.Status,
        p.Status.ToString(), p.SubmittedAt);

    private static EscrowResponse MapEscrow(EscrowTransaction e) => new(
        e.EscrowId, e.TaskId, e.AmountUSD, (int)e.Status,
        e.Status.ToString(), e.HeldAt, e.ReleasedAt, e.ReleasedToUserId);
}