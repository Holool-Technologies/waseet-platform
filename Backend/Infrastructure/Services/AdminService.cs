using Application.Features.Admin.DTOs;
using Application.Features.Admin.Interfaces;
using Application.Features.Notifications.Interfaces;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services;

public class AdminService : IAdminService
{
    private readonly WaseetDbContext _db;
    private readonly EncryptionService _encryption;
    private readonly INotificationService _notifications;

    public AdminService(WaseetDbContext db, EncryptionService encryption, INotificationService notifications)
    {
        _db = db;
        _encryption = encryption;
        _notifications = notifications;

    }

    public async Task<DashboardStatsResponse> GetStatsAsync(CancellationToken ct = default)
    {
        var users      = await _db.Users.CountAsync(ct);
        var clients    = await _db.Users.CountAsync(u => u.Role == Domain.Enums.UserRole.Client, ct);
        var freelancers= await _db.Users.CountAsync(u => u.Role == Domain.Enums.UserRole.Freelancer, ct);
        var tasks      = await _db.Tasks.CountAsync(ct);
        var open       = await _db.Tasks.CountAsync(t => t.Status == Domain.Enums.TaskStatus.Open, ct);
        var active     = await _db.Tasks.CountAsync(t => t.Status == Domain.Enums.TaskStatus.Active, ct);
        var completed  = await _db.Tasks.CountAsync(t => t.Status == Domain.Enums.TaskStatus.Completed, ct);
        var disputed   = await _db.Tasks.CountAsync(t => t.Status == Domain.Enums.TaskStatus.Disputed, ct);

        var msgs       = await _db.ChatMessages.CountAsync(ct);
        var blocked    = await _db.ChatMessages.CountAsync(m => m.AiFlags.Contains("\"blocked\":true"), ct);

        var totalEscrow = await _db.EscrowTransactions.SumAsync(e => e.AmountUSD, ct);
        var heldEscrow  = await _db.EscrowTransactions
            .Where(e => e.Status == Domain.Enums.EscrowStatus.Held)
            .SumAsync(e => e.AmountUSD, ct);

        return new DashboardStatsResponse(
            users, clients, freelancers,
            tasks, open, active, completed, disputed,
            msgs, blocked, totalEscrow, heldEscrow,
            DateTime.UtcNow);
    }

    public async Task<AdminPagedResult<AdminUserResponse>> GetUsersAsync(
        int page, int pageSize, string? search, string? role, CancellationToken ct = default)
    {
        var query = _db.Users.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(u => u.Email.Contains(search));

        if (!string.IsNullOrWhiteSpace(role) && Enum.TryParse<Domain.Enums.UserRole>(role, out var r))
            query = query.Where(u => u.Role == r);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new AdminUserResponse(
                u.UserId, u.Email, u.Role.ToString(),
                _db.Tasks.Count(t => t.ClientUserId == u.UserId || t.FreelancerUserId == u.UserId),
                u.CreatedAt,
                false
            ))
            .ToListAsync(ct);

        return Paged(items, total, page, pageSize);
    }

    public async Task BanUserAsync(Guid userId, bool ban, CancellationToken ct = default)
    {
        var user = await _db.Users.FindAsync([userId], ct)
            ?? throw new KeyNotFoundException("User not found.");
        await _db.SaveChangesAsync(ct);
    }

    public async Task DeleteUserAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _db.Users.FindAsync([userId], ct)
            ?? throw new KeyNotFoundException("User not found.");
        _db.Users.Remove(user);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<AdminPagedResult<AdminTaskResponse>> GetTasksAsync(
        int page, int pageSize, string? search, string? status, CancellationToken ct = default)
    {
        var query = _db.Tasks
            .Include(t => t.Proposals)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(t => t.Title.Contains(search) || t.PublicTaskCode.Contains(search));

        if (!string.IsNullOrWhiteSpace(status) &&
            Enum.TryParse<Domain.Enums.TaskStatus>(status, out var s))
            query = query.Where(t => t.Status == s);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(t => t.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new AdminTaskResponse(
                t.TaskId, t.PublicTaskCode, t.Title,
                t.Category.ToString().Replace("_", " & "),
                t.BudgetUSD, t.Status.ToString(),
                t.Proposals.Count, t.CreatedAt))
            .ToListAsync(ct);

        return Paged(items, total, page, pageSize);
    }

    public async Task DeleteTaskAsync(Guid taskId, CancellationToken ct = default)
    {
        var task = await _db.Tasks.FindAsync([taskId], ct)
            ?? throw new KeyNotFoundException("Task not found.");
        _db.Tasks.Remove(task);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<AdminPagedResult<AdminEscrowResponse>> GetEscrowsAsync(
        int page, int pageSize, string? status, CancellationToken ct = default)
    {
        var query = _db.EscrowTransactions
            .Include(e => e.Task)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) &&
            Enum.TryParse<Domain.Enums.EscrowStatus>(status, out var s))
            query = query.Where(e => e.Status == s);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(e => e.HeldAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(e => new AdminEscrowResponse(
                e.EscrowId, e.Task.PublicTaskCode,
                e.AmountUSD, e.Status.ToString(),
                e.HeldAt, e.ReleasedAt))
            .ToListAsync(ct);

        return Paged(items, total, page, pageSize);
    }

    public async Task ResolveDisputeAsync(
        Guid escrowId, string resolution, CancellationToken ct = default)
    {
        var escrow = await _db.EscrowTransactions
            .Include(e => e.Task)
            .FirstOrDefaultAsync(e => e.EscrowId == escrowId, ct)
            ?? throw new KeyNotFoundException("Escrow not found.");

        if (escrow.Status != Domain.Enums.EscrowStatus.Disputed)
            throw new InvalidOperationException("Escrow is not in Disputed status.");

        escrow.Status = resolution.ToLower() == "release"
            ? Domain.Enums.EscrowStatus.Released
            : Domain.Enums.EscrowStatus.Refunded;

        escrow.ReleasedAt = DateTime.UtcNow;
        escrow.Task.Status = Domain.Enums.TaskStatus.Completed;
        escrow.Task.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
    }

    public async Task<AdminPagedResult<AdminChatMessageResponse>> GetChatLogsAsync(
        int page, int pageSize, bool blockedOnly, CancellationToken ct = default)
    {
        var query = _db.ChatMessages
            .Include(m => m.Task)
            .AsNoTracking()
            .AsQueryable();

        if (blockedOnly)
            query = query.Where(m => m.AiFlags.Contains("\"blocked\":true"));

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(m => m.SentAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(m => new AdminChatMessageResponse(
                m.MessageId,
                m.Task.PublicTaskCode,
                m.Task.ClientUserId == m.SenderUserId ? "Client" : "Freelancer",
                m.SanitizedContent,
                m.AiFlags.Contains("\"pii_detected\":true"),
                m.AiFlags.Contains("\"blocked\":true"),
                m.AiFlags,
                m.SentAt))
            .ToListAsync(ct);

        return Paged(items, total, page, pageSize);
    }

    private static AdminPagedResult<T> Paged<T>(
        IEnumerable<T> items, int total, int page, int pageSize) =>
        new(items, total, page, pageSize,
            (int)Math.Ceiling(total / (double)pageSize));
}