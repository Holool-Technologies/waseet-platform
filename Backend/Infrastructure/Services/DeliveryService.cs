using Application.Features.Notifications.Interfaces;
using Domain.Enums;
using Domain.Interfaces;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Waseet.Application.Features.Delivery.DTOs;
using Waseet.Application.Features.Delivery.Interfaces;
using Waseet.Domain.Entities;
using Waseet.Domain.Interfaces;
using Waseet.Infrastructure.Persistence;

using TaskStatus = Domain.Enums.TaskStatus;

namespace Waseet.Infrastructure.Services;

public class DeliveryService : IDeliveryService
{
    private readonly WaseetDbContext _db;
    private readonly IFileStorageService _storage;
    private readonly IPaymentGatewayService _payments;
    private readonly INotificationService _notifications;
    private readonly ILogger<DeliveryService> _logger;

    // Review window before auto-release kicks in
    private const int AutoReleaseDays = 5;

    public DeliveryService(
        WaseetDbContext db,
        IFileStorageService storage,
        IPaymentGatewayService payments,
        INotificationService notifications,
        ILogger<DeliveryService> logger)
    {
        _db = db;
        _storage = storage;
        _payments = payments;
        _notifications = notifications;
        _logger = logger;
    }

    // ── Freelancer submits a delivery ──────────────────────────────────────

    public async Task<DeliveryResponse> SubmitDeliveryAsync(
        Guid freelancerUserId,
        string taskCode,
        string note,
        List<(Stream Stream, string FileName, string ContentType)> files,
        CancellationToken ct = default)
    {
        var task = await _db.Tasks
            .FirstOrDefaultAsync(t => t.PublicTaskCode == taskCode, ct)
            ?? throw new KeyNotFoundException("Task not found.");

        if (task.FreelancerUserId != freelancerUserId)
            throw new UnauthorizedAccessException(
                "Only the awarded freelancer can deliver this task.");

        if (task.Status != TaskStatus.Active)
            throw new InvalidOperationException("TASK_NOT_ACTIVE");

        if (files.Count == 0)
            throw new InvalidOperationException("FILE_REQUIRED");

        if (files.Count > 10)
            throw new InvalidOperationException("TOO_MANY_FILES");

        var delivery = new Delivery
        {
            TaskId = task.TaskId,
            FreelancerUserId = freelancerUserId,
            Note = note.Trim(),
            Status = DeliveryStatus.AwaitingReview,
            ReviewDeadline = DateTime.UtcNow.AddDays(AutoReleaseDays)
        };

        _db.Deliveries.Add(delivery);

        foreach (var (stream, fileName, contentType) in files)
        {
            var blobRef = await _storage.UploadAsync(
                stream, fileName, contentType, folder: "deliveries", ct);

            delivery.Files.Add(new DeliveryFile
            {
                DeliveryId = delivery.DeliveryId,
                FileName = fileName,
                BlobRef = blobRef,
                SizeBytes = stream.Length,
                ContentType = contentType
            });
        }

        task.Status = TaskStatus.Delivered;
        task.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        // Notify the client
        await _notifications.CreateAndPushAsync(
            task.ClientUserId,
            NotificationType.NewMessage, // reuse generic type or add DeliverySubmitted
            "Work Delivered",
            "تم تسليم العمل",
            $"The freelancer has submitted a delivery for \"{task.Title}\". " +
            $"Please review within {AutoReleaseDays} days.",
            $"قام المستقل بتسليم العمل الخاص بمهمة \"{task.Title}\". " +
            $"يرجى المراجعة خلال {AutoReleaseDays} أيام.",
            delivery.DeliveryId.ToString(),
            $"/tasks/{task.PublicTaskCode}/delivery",
            ct);

        return MapDelivery(delivery);
    }

    // ── Get the active (most recent) delivery for a task ───────────────────

    public async Task<DeliveryResponse?> GetActiveDeliveryAsync(
        string taskCode, CancellationToken ct = default)
    {
        var delivery = await _db.Deliveries
            .Include(d => d.Files)
            .Include(d => d.Task)
            .AsNoTracking()
            .Where(d => d.Task.PublicTaskCode == taskCode)
            .OrderByDescending(d => d.SubmittedAt)
            .FirstOrDefaultAsync(ct);

        return delivery is null ? null : MapDelivery(delivery);
    }

    // ── Client accepts — release escrow ─────────────────────────────────────

    public async Task<DeliveryResponse> AcceptDeliveryAsync(
        Guid clientUserId, Guid deliveryId, CancellationToken ct = default)
    {
        var delivery = await _db.Deliveries
            .Include(d => d.Task)
            .Include(d => d.Files)
            .FirstOrDefaultAsync(d => d.DeliveryId == deliveryId, ct)
            ?? throw new KeyNotFoundException("Delivery not found.");

        if (delivery.Task.ClientUserId != clientUserId)
            throw new UnauthorizedAccessException("Only the task client can accept delivery.");

        if (delivery.Status != DeliveryStatus.AwaitingReview)
            throw new InvalidOperationException("DELIVERY_ALREADY_RESOLVED");

        await ReleaseEscrowAsync(delivery, DeliveryStatus.Accepted, ct);

        return MapDelivery(delivery);
    }

    // ── Client reports a problem — opens a dispute, freezes escrow ─────────

    public async Task<DisputeResponse> ReportDeliveryAsync(
        Guid clientUserId, Guid deliveryId, string report, CancellationToken ct = default)
    {
        var delivery = await _db.Deliveries
            .Include(d => d.Task)
            .FirstOrDefaultAsync(d => d.DeliveryId == deliveryId, ct)
            ?? throw new KeyNotFoundException("Delivery not found.");

        if (delivery.Task.ClientUserId != clientUserId)
            throw new UnauthorizedAccessException("Only the task client can report a delivery.");

        if (delivery.Status != DeliveryStatus.AwaitingReview)
            throw new InvalidOperationException("DELIVERY_ALREADY_RESOLVED");

        if (string.IsNullOrWhiteSpace(report) || report.Trim().Length < 20)
            throw new InvalidOperationException("REPORT_TOO_SHORT");

        delivery.Status = DeliveryStatus.Disputed;
        delivery.RespondedAt = DateTime.UtcNow;

        var escrow = await _db.EscrowTransactions
            .FirstOrDefaultAsync(e => e.TaskId == delivery.TaskId, ct);
        if (escrow is not null)
            escrow.Status = EscrowStatus.Disputed;

        delivery.Task.Status = TaskStatus.Disputed;
        delivery.Task.UpdatedAt = DateTime.UtcNow;

        var dispute = new Dispute
        {
            DeliveryId = deliveryId,
            TaskId = delivery.TaskId,
            RaisedByUserId = clientUserId,
            Report = report.Trim(),
            Status = DisputeStatus.Open
        };

        _db.Disputes.Add(dispute);
        await _db.SaveChangesAsync(ct);

        // Notify the freelancer
        await _notifications.CreateAndPushAsync(
            delivery.FreelancerUserId,
            NotificationType.NewMessage,
            "Delivery Disputed",
            "تم الإبلاغ عن مشكلة في التسليم",
            $"The client raised a concern about your delivery for \"{delivery.Task.Title}\". " +
            "An admin will review the case.",
            $"أبلغ العميل عن مشكلة في تسليمك لمهمة \"{delivery.Task.Title}\". " +
            "سيقوم أحد المشرفين بمراجعة الحالة.",
            dispute.DisputeId.ToString(),
            $"/tasks/{delivery.Task.PublicTaskCode}/delivery",
            ct);

        return MapDispute(dispute);
    }

    // ── Background job: auto-release deliveries past their deadline ────────

    public async Task<int> ProcessAutoReleasesAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;

        var dueDeliveries = await _db.Deliveries
            .Include(d => d.Task)
            .Include(d => d.Files)
            .Where(d => d.Status == DeliveryStatus.AwaitingReview
                     && d.ReviewDeadline <= now)
            .ToListAsync(ct);

        int processed = 0;

        foreach (var delivery in dueDeliveries)
        {
            try
            {
                await ReleaseEscrowAsync(delivery, DeliveryStatus.AutoReleased, ct);
                processed++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "Auto-release failed for delivery {DeliveryId}", delivery.DeliveryId);
                // Continue processing other deliveries — one failure shouldn't block the batch
            }
        }

        if (processed > 0)
            _logger.LogInformation(
                "Auto-released {Count} deliveries past their review deadline.", processed);

        return processed;
    }

    // ── Shared escrow release logic (accept + auto-release both call this) ──

    private async Task ReleaseEscrowAsync(
        Delivery delivery, DeliveryStatus resultStatus, CancellationToken ct)
    {
        var escrow = await _db.EscrowTransactions
            .FirstOrDefaultAsync(e => e.TaskId == delivery.TaskId, ct)
            ?? throw new InvalidOperationException("ESCROW_NOT_FOUND");

        if (escrow.Status != EscrowStatus.Held)
            throw new InvalidOperationException("ESCROW_ALREADY_SETTLED");

        // Call the payment gateway abstraction — simulated today, real provider later
        var result = await _payments.ReleaseToFreelancerAsync(
            escrow.EscrowId, escrow.AmountUSD, delivery.FreelancerUserId, ct);

        if (!result.Success)
        {
            _logger.LogError(
                "Payment release failed for escrow {EscrowId}: {Reason}",
                escrow.EscrowId, result.FailureReason);
            throw new InvalidOperationException("PAYMENT_RELEASE_FAILED");
        }

        escrow.Status = EscrowStatus.Released;
        escrow.ProviderReference = result.ProviderReference;

        delivery.Status = resultStatus;
        delivery.RespondedAt = DateTime.UtcNow;

        delivery.Task.Status = TaskStatus.Completed;
        delivery.Task.UpdatedAt = DateTime.UtcNow;

        // Credit the freelancer's profile balance
        var profile = await _db.FreelancerProfiles
            .FirstOrDefaultAsync(p => p.UserId == delivery.FreelancerUserId, ct);
        if (profile is not null)
        {
            profile.Balance += escrow.AmountUSD;
            profile.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync(ct);

        var titleEn = resultStatus == DeliveryStatus.AutoReleased
            ? "Payment Auto-Released"
            : "Delivery Accepted";
        var titleAr = resultStatus == DeliveryStatus.AutoReleased
            ? "تم تحرير الدفع تلقائياً"
            : "تم قبول التسليم";

        await _notifications.CreateAndPushAsync(
            delivery.FreelancerUserId,
            NotificationType.ProposalAwarded,
            titleEn, titleAr,
            $"${escrow.AmountUSD:0.00} has been released to your balance for \"{delivery.Task.Title}\".",
            $"تم تحويل ${escrow.AmountUSD:0.00} إلى رصيدك مقابل مهمة \"{delivery.Task.Title}\".",
            delivery.DeliveryId.ToString(),
            "/profile",
            ct);
    }

    // ── Admin dispute review ────────────────────────────────────────────────

    public async Task<IEnumerable<DisputeResponse>> GetOpenDisputesAsync(
        CancellationToken ct = default)
    {
        return await _db.Disputes
            .AsNoTracking()
            .Where(d => d.Status == DisputeStatus.Open)
            .OrderBy(d => d.CreatedAt)
            .Select(d => new DisputeResponse(
                d.DisputeId, d.DeliveryId, d.TaskId,
                d.Report, d.Status.ToString(),
                d.Resolution.HasValue ? d.Resolution.ToString() : null,
                d.AdminNotes, d.CreatedAt, d.ResolvedAt))
            .ToListAsync(ct);
    }

    public async Task<DisputeResponse> AdminResolveDisputeAsync(
        Guid adminId, Guid disputeId, string resolution, string notes,
        CancellationToken ct = default)
    {
        var dispute = await _db.Disputes
            .Include(d => d.Task)
            .FirstOrDefaultAsync(d => d.DisputeId == disputeId, ct)
            ?? throw new KeyNotFoundException("Dispute not found.");

        if (dispute.Status != DisputeStatus.Open)
            throw new InvalidOperationException("DISPUTE_ALREADY_RESOLVED");

        var delivery = await _db.Deliveries
            .Include(d => d.Task)
            .FirstOrDefaultAsync(d => d.DeliveryId == dispute.DeliveryId, ct)
            ?? throw new KeyNotFoundException("Delivery not found.");

        var escrow = await _db.EscrowTransactions
            .FirstOrDefaultAsync(e => e.TaskId == dispute.TaskId, ct)
            ?? throw new InvalidOperationException("ESCROW_NOT_FOUND");

        var favorFreelancer = resolution.Equals(
            "FavorFreelancer", StringComparison.OrdinalIgnoreCase);

        if (favorFreelancer)
        {
            var result = await _payments.ReleaseToFreelancerAsync(
                escrow.EscrowId, escrow.AmountUSD, delivery.FreelancerUserId, ct);

            if (!result.Success)
                throw new InvalidOperationException("PAYMENT_RELEASE_FAILED");

            escrow.Status = EscrowStatus.Released;
            escrow.ProviderReference = result.ProviderReference;
            delivery.Task.Status = TaskStatus.Completed;

            var profile = await _db.FreelancerProfiles
                .FirstOrDefaultAsync(p => p.UserId == delivery.FreelancerUserId, ct);
            if (profile is not null)
                profile.Balance += escrow.AmountUSD;
        }
        else
        {
            var result = await _payments.RefundToClientAsync(
                escrow.EscrowId, escrow.AmountUSD, dispute.Task.ClientUserId, ct);

            if (!result.Success)
                throw new InvalidOperationException("PAYMENT_REFUND_FAILED");

            escrow.Status = EscrowStatus.Refunded;
            escrow.ProviderReference = result.ProviderReference;
            delivery.Task.Status = TaskStatus.Cancelled;
        }

        dispute.Status = DisputeStatus.Resolved;
        dispute.Resolution = favorFreelancer
            ? DisputeResolution.FavorFreelancer
            : DisputeResolution.FavorClient;
        dispute.ResolvedByAdminId = adminId;
        dispute.AdminNotes = notes;
        dispute.ResolvedAt = DateTime.UtcNow;

        delivery.Task.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        // Notify both parties
        var winnerId = favorFreelancer ? delivery.FreelancerUserId : dispute.Task.ClientUserId;
        var amountText = $"${escrow.AmountUSD:0.00}";

        await _notifications.CreateAndPushAsync(
            winnerId,
            NotificationType.ProposalAwarded,
            "Dispute Resolved In Your Favor",
            "تم حل النزاع لصالحك",
            $"The dispute for \"{dispute.Task.Title}\" was resolved in your favor. {amountText} has been settled.",
            $"تم حل النزاع الخاص بمهمة \"{dispute.Task.Title}\" لصالحك. تم تسوية {amountText}.",
            dispute.DisputeId.ToString(),
            "/profile",
            ct);

        var loserId = favorFreelancer ? dispute.Task.ClientUserId : delivery.FreelancerUserId;
        await _notifications.CreateAndPushAsync(
            loserId,
            NotificationType.TaskRejected,
            "Dispute Resolved",
            "تم حل النزاع",
            $"The dispute for \"{dispute.Task.Title}\" has been resolved by an admin. {notes}",
            $"تم حل النزاع الخاص بمهمة \"{dispute.Task.Title}\" من قِبل المشرف. {notes}",
            dispute.DisputeId.ToString(),
            "/my-tasks",
            ct);

        return MapDispute(dispute);
    }

    // ── Mapping helpers ───────────────────────────────────────────────────

    private static DeliveryResponse MapDelivery(Delivery d) => new(
        d.DeliveryId, d.TaskId, d.FreelancerUserId,
        d.Note, d.Status.ToString(), d.SubmittedAt,
        d.ReviewDeadline, d.RespondedAt,
        d.Files.Select(f => new DeliveryFileResponse(
            f.FileId, f.FileName, $"/deliveries/{Path.GetFileName(f.BlobRef)}",
            f.SizeBytes, f.ContentType, f.UploadedAt)));

    private static DisputeResponse MapDispute(Dispute d) => new(
        d.DisputeId, d.DeliveryId, d.TaskId,
        d.Report, d.Status.ToString(),
        d.Resolution?.ToString(), d.AdminNotes,
        d.CreatedAt, d.ResolvedAt);
}