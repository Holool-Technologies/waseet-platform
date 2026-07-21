using Application.Features.Delivery.DTOs;
using Application.Features.Delivery.Interfaces;
using Application.Features.Delivery.StateMachine;
using Application.Features.Notifications.Interfaces;
using Domain.Entities;
using Domain.Enums;
using Domain.Interfaces;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using System.Threading.Tasks;
using Waseet.Application.Features.Stats.Interfaces;
using Task = System.Threading.Tasks.Task;
using TaskStatus=Domain.Enums.TaskStatus;
namespace Infrastructure.Services;

public class DeliveryService : IDeliveryService
{
    private readonly WaseetDbContext _db;
    private readonly IFileStorageService _storage;
    private readonly IPaymentGatewayService _payments;
    private readonly INotificationService _notifications;
    private readonly IAuditLogService _audit;
    private readonly ILogger<DeliveryService> _logger;
    private readonly IAiSanitizerService _sanitizer;
    private readonly IStatsService _stats;
    public DeliveryService(
        WaseetDbContext db,
        IFileStorageService storage,
        IPaymentGatewayService payments,
        INotificationService notifications,
        IAuditLogService audit,
        ILogger<DeliveryService> logger,
        IAiSanitizerService sanitizer,
        IStatsService stats
        )
    {
        _db = db;
        _storage = storage;
        _payments = payments;
        _notifications = notifications;
        _audit = audit;
        _logger = logger;
        _sanitizer = sanitizer;
        _stats = stats;
    }

    public async Task<IEnumerable<DeliveryResponse>> GetDeliveryHistoryAsync(
    string taskCode, Guid requestingUserId, CancellationToken ct = default)
    {
        var task = await _db.Tasks.AsNoTracking()
            .FirstOrDefaultAsync(t => t.PublicTaskCode == taskCode, ct)
            ?? throw new KeyNotFoundException("Task not found.");

        bool isParty = task.ClientUserId == requestingUserId
                    || task.FreelancerUserId == requestingUserId;

        if (!isParty)
            throw new UnauthorizedAccessException("Not authorized.");

        var settings = await GetSettingsEntityAsync(ct);

        var deliveries = await _db.Deliveries
            .Include(d => d.Files)
            .Include(d => d.Task)
            .AsNoTracking()
            .Where(d => d.TaskId == task.TaskId)
            .OrderByDescending(d => d.SubmittedAt)
            .ToListAsync(ct);
        var totalRevisions = await _db.Deliveries
    .CountAsync(x => x.TaskId == task.TaskId && x.RevisionNumber > 0, ct);
        return await Task.WhenAll(
            deliveries.Select(d => MapDeliveryAsync(d, settings.MaxRevisions, totalRevisions, ct)));
    }

    public async Task<IEnumerable<RevisionRequestResponse>> GetRevisionRequestsAsync(
        string taskCode, Guid requestingUserId, CancellationToken ct = default)
    {
        var task = await _db.Tasks.AsNoTracking()
            .FirstOrDefaultAsync(t => t.PublicTaskCode == taskCode, ct)
            ?? throw new KeyNotFoundException("Task not found.");

        bool isParty = task.ClientUserId == requestingUserId
                    || task.FreelancerUserId == requestingUserId;

        if (!isParty)
            throw new UnauthorizedAccessException("Not authorized.");

        return await _db.RevisionRequests
            .AsNoTracking()
            .Where(r => r.TaskId == task.TaskId)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new RevisionRequestResponse(
                r.RevisionId, r.DeliveryId,
                r.Reason, r.Status.ToString(), r.CreatedAt))
            .ToListAsync(ct);
    }





    // ── Settings ──────────────────────────────────────────────────────────────

    private async Task<DeliverySettings> GetSettingsEntityAsync(CancellationToken ct)
    {
        return await _db.DeliverySettings.FindAsync([1], ct)
            ?? new DeliverySettings();
    }

    public async Task<DeliverySettingsResponse> GetSettingsAsync(CancellationToken ct = default)
    {
        var s = await GetSettingsEntityAsync(ct);
        return new DeliverySettingsResponse(s.ReviewWindowDays, s.MaxRevisions);
    }

    public async Task UpdateSettingsAsync(
        int reviewWindowDays, int maxRevisions, CancellationToken ct = default)
    {
        var s = await GetSettingsEntityAsync(ct);
        s.ReviewWindowDays = reviewWindowDays;
        s.MaxRevisions = maxRevisions;
        s.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    // ── Freelancer: submit delivery ────────────────────────────────────────────

    public async Task<DeliveryResponse> SubmitDeliveryAsync(
    Guid freelancerUserId,
    string taskCode,
    string note,
    string? videoUrl,
    List<DeliveryLink> links,
    List<(Stream Stream, string FileName, string ContentType)> files,
    CancellationToken ct = default)
    {
        var task = await _db.Tasks
            .FirstOrDefaultAsync(t => t.PublicTaskCode == taskCode, ct)
            ?? throw new KeyNotFoundException("Task not found.");

        // Authorization
        if (task.FreelancerUserId != freelancerUserId)
            throw new UnauthorizedAccessException("Only the awarded freelancer can submit a delivery.");

        // State validation
        if (task.Status != TaskStatus.Active && task.Status != TaskStatus.Delivered)
            throw new InvalidOperationException("TASK_NOT_ACTIVE");

        // Business rule R2
        if (files.Count == 0)
            throw new InvalidOperationException("FILE_REQUIRED");
        if (files.Count > 10)
            throw new InvalidOperationException("TOO_MANY_FILES");

        var openRevision = await _db.RevisionRequests
       .Where(r => r.TaskId == task.TaskId && r.Status == RevisionStatus.Open)
       .FirstOrDefaultAsync(ct);

        if (openRevision is not null)
        {
            openRevision.Status = RevisionStatus.Resolved;
            openRevision.ResolvedAt = DateTime.UtcNow;
        }

        var settings = await GetSettingsEntityAsync(ct);

        // Count existing deliveries to get revision number
        var deliveryCount = await _db.Deliveries
            .CountAsync(d => d.TaskId == task.TaskId, ct);
        // In SubmitDeliveryAsync — sanitize note:
        if (!string.IsNullOrWhiteSpace(note))
        {
            var noteSanitized = await _sanitizer.SanitizeAsync(note.Trim(), ct);
            if (noteSanitized.Blocked)
                throw new InvalidOperationException("DELIVERY_NOTE_BLOCKED");
            note = noteSanitized.SanitizedContent;
        }
        var delivery = new Delivery
        {
            TaskId = task.TaskId,
            FreelancerUserId = freelancerUserId,
            RevisionNumber = deliveryCount,
            Note = note.Trim(),
            VideoUrl = videoUrl?.Trim(),
            Links = JsonSerializer.Serialize(links),
            ReviewDeadline = DateTime.UtcNow.AddDays(settings.ReviewWindowDays)
        };


        _db.Deliveries.Add(delivery);

        foreach (var (stream, fileName, contentType) in files)
        {
            var blobRef = await _storage.UploadAsync(
                stream, fileName, contentType, folder: "deliveries", ct);

            delivery.Files.Add(new DeliveryFile
            {
                DeliveryId = delivery.DeliveryId,
                OriginalFileName = fileName,
                BlobRef = blobRef,
                SizeBytes = stream.Length,
                ContentType = contentType
            });
        }

        task.Status = TaskStatus.Delivered;
        task.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        // Audit
        await _audit.LogAsync("Delivery", delivery.DeliveryId,
            "DeliverySubmitted", "Freelancer", freelancerUserId,
            new
            {
                task.PublicTaskCode,
                RevisionNumber = delivery.RevisionNumber,
                FileCount = files.Count,
                settings.ReviewWindowDays
            });

        // Notify client
        await _notifications.CreateAndPushAsync(
            task.ClientUserId,
            NotificationType.NewMessage,
            "Work Delivered — Please Review",
            "تم تسليم العمل — يرجى المراجعة",
            $"The freelancer submitted a delivery for \"{task.Title}\". " +
            $"You have {settings.ReviewWindowDays} days to review, accept, request revisions, or open a dispute.",
            $"قام المستقل بتسليم العمل \"{task.Title}\". " +
            $"لديك {settings.ReviewWindowDays} أيام للمراجعة والموافقة أو طلب تعديلات أو فتح نزاع.",
            delivery.DeliveryId.ToString(),
            $"/review/{task.PublicTaskCode}",
            ct);
        var totalRevisions = await _db.Deliveries
    .CountAsync(x => x.TaskId == task.TaskId && x.RevisionNumber > 0, ct);
        return await MapDeliveryAsync(delivery, settings.MaxRevisions,totalRevisions, ct);
    }

    // ── Get active delivery ───────────────────────────────────────────────────

    public async Task<DeliveryResponse?> GetActiveDeliveryAsync(
        string taskCode, Guid requestingUserId, CancellationToken ct = default)
    {
        var delivery = await _db.Deliveries
            .Include(d => d.Files)
            .Include(d => d.Task)
            .AsNoTracking()
            .Where(d => d.Task.PublicTaskCode == taskCode)
            .OrderByDescending(d => d.SubmittedAt)
            .FirstOrDefaultAsync(ct);

        if (delivery is null) return null;

        var isParty = delivery.Task.ClientUserId == requestingUserId
                   || delivery.Task.FreelancerUserId == requestingUserId;

        if (!isParty) throw new UnauthorizedAccessException("Not authorized.");

        var settings = await GetSettingsEntityAsync(ct);
        var totalRevisions = await _db.Deliveries
    .CountAsync(x => x.TaskId == delivery.Task.TaskId && x.RevisionNumber > 0, ct);
        return await MapDeliveryAsync(delivery, settings.MaxRevisions,totalRevisions, ct);
    }

    // ── Client: accept delivery ───────────────────────────────────────────────

    public async Task<DeliveryResponse> AcceptDeliveryAsync(
        Guid clientUserId, Guid deliveryId, CancellationToken ct = default)
    {
        var delivery = await GetDeliveryWithTaskAsync(deliveryId, ct);

        // Authorization
        if (delivery.Task.ClientUserId != clientUserId)
            throw new UnauthorizedAccessException("Only the task client can accept.");

        // State machine check
        if (!DeliveryStateMachine.CanTransition(
            delivery.Status, DeliveryStatus.Accepted, ActorType.Client))
        {
            throw new InvalidOperationException("DELIVERY_ALREADY_RESOLVED");
        }

        await ReleaseEscrowInternalAsync(
            delivery, DeliveryStatus.Accepted, clientUserId, "Client", ct);

        var settings = await GetSettingsEntityAsync(ct);
        var totalRevisions = await _db.Deliveries
    .CountAsync(x => x.TaskId == delivery.Task.TaskId && x.RevisionNumber > 0, ct);
        return await MapDeliveryAsync(delivery, settings.MaxRevisions,totalRevisions, ct);
    }

    // ── Client: request revision ──────────────────────────────────────────────

    public async Task<RevisionRequestResponse> RequestRevisionAsync(
        Guid clientUserId, Guid deliveryId, string reason, CancellationToken ct = default)
    {
        var delivery = await GetDeliveryWithTaskAsync(deliveryId, ct);

        if (delivery.Task.ClientUserId != clientUserId)
            throw new UnauthorizedAccessException("Only the task client can request revisions.");

        if (!DeliveryStateMachine.CanTransition(
            delivery.Status, DeliveryStatus.RevisionRequested, ActorType.Client))
        {
            throw new InvalidOperationException("DELIVERY_ALREADY_RESOLVED");
        }

        // Business rule R7 — max revisions
        var settings = await GetSettingsEntityAsync(ct);
        var revisionCount = await _db.Deliveries
            .CountAsync(d => d.TaskId == delivery.TaskId && d.RevisionNumber > 0, ct);

        if (revisionCount >= settings.MaxRevisions)
            throw new InvalidOperationException("MAX_REVISIONS_REACHED");

        if (string.IsNullOrWhiteSpace(reason) || reason.Trim().Length < 10)
            throw new InvalidOperationException("REASON_TOO_SHORT");

        // In RequestRevisionAsync — sanitize reason:
        var reasonSanitized = await _sanitizer.SanitizeAsync(reason.Trim(), ct);
        if (reasonSanitized.Blocked)
            throw new InvalidOperationException("REVISION_REASON_BLOCKED");
        reason = reasonSanitized.SanitizedContent;

        // Create revision request
        var revision = new RevisionRequest
        {
            DeliveryId = deliveryId,
            TaskId = delivery.TaskId,
            RequestedByUserId = clientUserId,
            Reason = reason.Trim()
        };

        _db.RevisionRequests.Add(revision);

        delivery.Status = DeliveryStatus.RevisionRequested;
        delivery.RespondedAt = DateTime.UtcNow;
        delivery.Task.Status = TaskStatus.Active;

        await _db.SaveChangesAsync(ct);

        // Audit
        await _audit.LogAsync("Delivery", deliveryId,
            "RevisionRequested", "Client", clientUserId,
            new
            {
                reason = reason.Trim(),
                revisionCount = revisionCount + 1,
                maxRevisions = settings.MaxRevisions
            });

        // Notify freelancer
        await _notifications.CreateAndPushAsync(
            delivery.FreelancerUserId,
            NotificationType.NewMessage,
            "Revision Requested",
            "طُلب منك تعديل",
            $"The client requested changes for \"{delivery.Task.Title}\". " +
            $"Reason: {reason.Trim()[..Math.Min(100, reason.Trim().Length)]}",
            $"طلب العميل تعديلات على مهمة \"{delivery.Task.Title}\". " +
            $"السبب: {reason.Trim()[..Math.Min(100, reason.Trim().Length)]}",
            revision.RevisionId.ToString(),
            $"/my-workspace/{delivery.Task.PublicTaskCode}",
            ct);

        return new RevisionRequestResponse(
            revision.RevisionId, revision.DeliveryId,
            revision.Reason, revision.Status.ToString(),
            revision.CreatedAt);
    }

    // ── Client: open dispute ──────────────────────────────────────────────────

    public async Task<DisputeResponse> OpenDisputeAsync(
        Guid clientUserId, Guid deliveryId, string report, CancellationToken ct = default)
    {
        var delivery = await GetDeliveryWithTaskAsync(deliveryId, ct);

        if (delivery.Task.ClientUserId != clientUserId)
            throw new UnauthorizedAccessException("Only the task client can open a dispute.");

        if (!DeliveryStateMachine.CanTransition(
            delivery.Status, DeliveryStatus.Disputed, ActorType.Client))
        {
            throw new InvalidOperationException("DELIVERY_ALREADY_RESOLVED");
        }

        if (string.IsNullOrWhiteSpace(report) || report.Trim().Length < 20)
            throw new InvalidOperationException("REPORT_TOO_SHORT");

        // Check no existing open dispute
        var existing = await _db.Disputes
            .AnyAsync(d => d.DeliveryId == deliveryId && d.Status != DisputeStatus.Resolved, ct);
        if (existing)
            throw new InvalidOperationException("DISPUTE_ALREADY_EXISTS");

        // Freeze escrow
        var escrow = await _db.EscrowTransactions
            .FirstOrDefaultAsync(e => e.TaskId == delivery.TaskId, ct);
        if (escrow is not null)
            escrow.Status = EscrowStatus.Disputed;

        delivery.Status = DeliveryStatus.Disputed;
        delivery.RespondedAt = DateTime.UtcNow;
        delivery.Task.Status = TaskStatus.Disputed;
        delivery.Task.UpdatedAt = DateTime.UtcNow;

        // In OpenDisputeAsync — sanitize report:
        var reportSanitized = await _sanitizer.SanitizeAsync(report.Trim(), ct);
        if (reportSanitized.Blocked)
            throw new InvalidOperationException("DISPUTE_REPORT_BLOCKED");
        report = reportSanitized.SanitizedContent;

        var dispute = new Dispute
        {
            DeliveryId = deliveryId,
            TaskId = delivery.TaskId,
            RaisedByUserId = clientUserId,
            Report = report.Trim()
        };

        _db.Disputes.Add(dispute);
        await _db.SaveChangesAsync(ct);

        // Audit
        await _audit.LogAsync("Dispute", dispute.DisputeId,
            "DisputeOpened", "Client", clientUserId,
            new { deliveryId, report = report.Trim()[..Math.Min(200, report.Trim().Length)] });

        // Notify freelancer + admin
        await _notifications.CreateAndPushAsync(
            delivery.FreelancerUserId,
            NotificationType.TaskRejected,
            "Dispute Opened",
            "تم فتح نزاع",
            $"The client opened a dispute for \"{delivery.Task.Title}\". " +
            "An admin will review the case. Escrow is frozen.",
            $"فتح العميل نزاعاً على مهمة \"{delivery.Task.Title}\". " +
            "سيقوم مشرف بمراجعة الحالة. الضمان مجمّد.",
            dispute.DisputeId.ToString(),
            $"/my-workspace/{delivery.Task.PublicTaskCode}",
            ct);

        return MapDispute(dispute);
    }

    // ── System: auto-release ──────────────────────────────────────────────────

    public async Task<int> ProcessAutoReleasesAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;

        var due = await _db.Deliveries
            .Include(d => d.Task)
            .Include(d => d.Files)
            .Where(d => d.Status == DeliveryStatus.AwaitingReview
                     && d.ReviewDeadline <= now)
            .ToListAsync(ct);

        int released = 0;

        foreach (var delivery in due)
        {
            try
            {
                await ReleaseEscrowInternalAsync(
                    delivery, DeliveryStatus.AutoReleased,
                    null, "System", ct);
                released++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "Auto-release failed for delivery {Id}", delivery.DeliveryId);
            }
        }

        return released;
    }

    // ── Admin: claim dispute ──────────────────────────────────────────────────

    public async Task<DisputeResponse> AdminClaimDisputeAsync(
        Guid adminId, Guid disputeId, CancellationToken ct = default)
    {
        var dispute = await _db.Disputes
            .FirstOrDefaultAsync(d => d.DisputeId == disputeId, ct)
            ?? throw new KeyNotFoundException("Dispute not found.");

        if (dispute.Status != DisputeStatus.Open)
            throw new InvalidOperationException("DISPUTE_NOT_OPEN");

        dispute.Status = DisputeStatus.UnderAdminReview;
        dispute.ClaimedByAdminId = adminId;
        dispute.ClaimedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        await _audit.LogAsync("Dispute", disputeId,
            "DisputeClaimed", "Admin", adminId, new { adminId });

        return MapDispute(dispute);
    }

    // ── Admin: resolve dispute ────────────────────────────────────────────────

    public async Task<DisputeResponse> AdminResolveDisputeAsync(
        Guid adminId, Guid disputeId,
        string resolution, string notes,
        CancellationToken ct = default,
        decimal? freelancerAmount = null, decimal? clientRefundAmount = null
        )
    {
        // Load with optimistic concurrency
        var dispute = await _db.Disputes
            .Include(d => d.Task)
            .FirstOrDefaultAsync(d => d.DisputeId == disputeId, ct)
            ?? throw new KeyNotFoundException("Dispute not found.");

        if (dispute.Status != DisputeStatus.UnderAdminReview)
            throw new InvalidOperationException("DISPUTE_NOT_UNDER_REVIEW");

        var delivery = await _db.Deliveries
            .Include(d => d.Task)
            .FirstOrDefaultAsync(d => d.DeliveryId == dispute.DeliveryId, ct)
            ?? throw new KeyNotFoundException("Delivery not found.");

        var escrow = await _db.EscrowTransactions
            .FirstOrDefaultAsync(e => e.TaskId == dispute.TaskId, ct)
            ?? throw new InvalidOperationException("ESCROW_NOT_FOUND");

        if (escrow.Status != EscrowStatus.Disputed)
            throw new InvalidOperationException("ESCROW_ALREADY_SETTLED");

        bool favorFreelancer = resolution.Equals(
            "FavorFreelancer", StringComparison.OrdinalIgnoreCase);

        // Determine amounts (supports partial in future)
        var toFreelancer = freelancerAmount ?? (favorFreelancer ? escrow.AmountUSD : 0);
        var toClient = clientRefundAmount ?? (favorFreelancer ? 0 : escrow.AmountUSD);

        if (favorFreelancer)
        {
            var result = await _payments.ReleaseToFreelancerAsync(
                escrow.EscrowId, toFreelancer, delivery.FreelancerUserId, ct);

            if (!result.Success)
                throw new InvalidOperationException("PAYMENT_RELEASE_FAILED");

            escrow.Status = EscrowStatus.Released;
            escrow.ProviderReference = result.ProviderReference;
            delivery.Task.Status = TaskStatus.Completed;

            // Credit freelancer balance
            var profile = await _db.FreelancerProfiles
                .FirstOrDefaultAsync(p => p.UserId == delivery.FreelancerUserId, ct);
            if (profile is not null)
            {
                profile.Balance += toFreelancer;
                profile.UpdatedAt = DateTime.UtcNow;
            }
        }
        else
        {
            var result = await _payments.RefundToClientAsync(
                escrow.EscrowId, toClient, dispute.Task.ClientUserId, ct);

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
        dispute.FreelancerAmount = toFreelancer;
        dispute.ClientRefundAmount = toClient;
        dispute.ResolvedAt = DateTime.UtcNow;
        delivery.Task.UpdatedAt = DateTime.UtcNow;

        // Optimistic concurrency - will throw DbUpdateConcurrencyException if another admin
        // resolved simultaneously
        try
        {
            await _db.SaveChangesAsync(ct);
            _ = Task.Run(async () =>
            {
                await _stats.RecomputeFreelancerAsync(delivery.FreelancerUserId);
                await _stats.RecomputeClientAsync(dispute.Task.ClientUserId);
            }, ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new InvalidOperationException("DISPUTE_CONCURRENCY_CONFLICT");
        }

        // Audit
        await _audit.LogAsync("Dispute", disputeId,
            "DisputeResolved", "Admin", adminId,
            new { resolution, notes, toFreelancer, toClient });

        // Notify both parties
        var winnerId = favorFreelancer
            ? delivery.FreelancerUserId
            : dispute.Task.ClientUserId;
        var loserId = favorFreelancer
            ? dispute.Task.ClientUserId
            : delivery.FreelancerUserId;
        var amount = favorFreelancer ? toFreelancer : toClient;

        await _notifications.CreateAndPushAsync(
            winnerId, NotificationType.ProposalAwarded,
            "Dispute Resolved In Your Favor",
            "تم حل النزاع لصالحك",
            $"The dispute for \"{dispute.Task.Title}\" was resolved in your favor. " +
            $"${amount:0.00} has been settled.",
            $"تم حل النزاع الخاص بمهمة \"{dispute.Task.Title}\" لصالحك. " +
            $"تم تسوية ${amount:0.00}.",
            disputeId.ToString(), "/profile", ct);

        await _notifications.CreateAndPushAsync(
            loserId, NotificationType.TaskRejected,
            "Dispute Decision",
            "قرار النزاع",
            $"The dispute for \"{dispute.Task.Title}\" has been decided by an admin. {notes}",
            $"تم البت في نزاع مهمة \"{dispute.Task.Title}\" من قِبل مشرف. {notes}",
            disputeId.ToString(), "/my-tasks", ct);

        return MapDispute(dispute);
    }

    // ── Admin: list open disputes ─────────────────────────────────────────────

    public async Task<IEnumerable<DisputeResponse>> GetOpenDisputesAsync(
        CancellationToken ct = default)
    {
        return await _db.Disputes
            .AsNoTracking()
            .Where(d => d.Status == DisputeStatus.Open
                     || d.Status == DisputeStatus.UnderAdminReview)
            .OrderBy(d => d.CreatedAt)
            .Select(d => new DisputeResponse(
                d.DisputeId, d.DeliveryId, d.TaskId,
                d.Report, d.Status.ToString(),
                d.Resolution.HasValue ? d.Resolution.ToString() : null,
                d.FreelancerAmount, d.ClientRefundAmount,
                d.AdminNotes, d.CreatedAt, d.ResolvedAt))
            .ToListAsync(ct);
    }

    // ── Audit log ────────────────────────────────────────────────────────────

    public async Task<IEnumerable<AuditLogResponse>> GetDeliveryAuditLogsAsync(
        Guid deliveryId, CancellationToken ct = default)
    {
        return await _audit.GetLogsAsync("Delivery", deliveryId, ct);
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private async Task ReleaseEscrowInternalAsync(
        Delivery delivery, DeliveryStatus resultStatus,
        Guid? actorId, string actorType, CancellationToken ct)
    {
        var escrow = await _db.EscrowTransactions
            .FirstOrDefaultAsync(e => e.TaskId == delivery.TaskId, ct)
            ?? throw new InvalidOperationException("ESCROW_NOT_FOUND");

        if (escrow.Status != EscrowStatus.Held)
            throw new InvalidOperationException("ESCROW_ALREADY_SETTLED");

        var result = await _payments.ReleaseToFreelancerAsync(
            escrow.EscrowId, escrow.AmountUSD, delivery.FreelancerUserId, ct);

        if (!result.Success)
        {
            _logger.LogError("Payment release failed: {Reason}", result.FailureReason);
            throw new InvalidOperationException("PAYMENT_RELEASE_FAILED");
        }

        escrow.Status = EscrowStatus.Released;
        escrow.ProviderReference = result.ProviderReference;

        delivery.Status = resultStatus;
        delivery.RespondedAt = DateTime.UtcNow;
        delivery.Task.Status = TaskStatus.Completed;
        delivery.Task.UpdatedAt = DateTime.UtcNow;

        // Credit freelancer
        var profile = await _db.FreelancerProfiles
            .FirstOrDefaultAsync(p => p.UserId == delivery.FreelancerUserId, ct);
        if (profile is not null)
        {
            profile.Balance += escrow.AmountUSD;
            profile.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync(ct);
        // Recompute stats for both parties after every resolution
        _ = Task.Run(async () =>
        {
            await _stats.RecomputeFreelancerAsync(delivery.FreelancerUserId);
            await _stats.RecomputeClientAsync(delivery.Task.ClientUserId);
        }, ct);



        // Audit
        await _audit.LogAsync("Delivery", delivery.DeliveryId,
            resultStatus == DeliveryStatus.AutoReleased
                ? "DeliveryAutoReleased"
                : "DeliveryAccepted",
            actorType, actorId,
            new
            {
                escrowId = escrow.EscrowId,
                amount = escrow.AmountUSD,
                providerRef = result.ProviderReference
            });

        var notifTitleEn = resultStatus == DeliveryStatus.AutoReleased
            ? "Payment Auto-Released" : "Delivery Accepted — Payment Released";
        var notifTitleAr = resultStatus == DeliveryStatus.AutoReleased
            ? "تم تحرير الدفع تلقائياً" : "تم قبول التسليم وتحرير الدفع";

        await _notifications.CreateAndPushAsync(
            delivery.FreelancerUserId,
            NotificationType.ProposalAwarded,
            notifTitleEn, notifTitleAr,
            $"${escrow.AmountUSD:0.00} has been added to your balance for \"{delivery.Task.Title}\".",
            $"تمت إضافة ${escrow.AmountUSD:0.00} إلى رصيدك مقابل مهمة \"{delivery.Task.Title}\".",
            delivery.DeliveryId.ToString(), "/profile", ct);

        if (resultStatus == DeliveryStatus.AutoReleased)
        {
            await _notifications.CreateAndPushAsync(
                delivery.Task.ClientUserId,
                NotificationType.TaskApproved,
                "Delivery Auto-Accepted",
                "تم قبول التسليم تلقائياً",
                $"The delivery for \"{delivery.Task.Title}\" was automatically accepted after {7} days. " +
                "Payment has been released to the freelancer.",
                $"تم قبول تسليم مهمة \"{delivery.Task.Title}\" تلقائياً بعد 7 أيام. " +
                "تم تحرير الدفع للمستقل.",
                delivery.DeliveryId.ToString(),
                $"/dashboard",
                ct);
        }
    }

    private async Task<Delivery> GetDeliveryWithTaskAsync(
        Guid deliveryId, CancellationToken ct)
    {
        return await _db.Deliveries
            .Include(d => d.Task)
            .Include(d => d.Files)
            .FirstOrDefaultAsync(d => d.DeliveryId == deliveryId, ct)
            ?? throw new KeyNotFoundException("Delivery not found.");
    }

    
    public async Task<DisputeCaseResponse> GetDisputeCaseAsync(
    Guid disputeId, CancellationToken ct = default)
    {
        var dispute = await _db.Disputes
            .Include(d => d.Task)
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.DisputeId == disputeId, ct)
            ?? throw new KeyNotFoundException("Dispute not found.");

        var settings = await GetSettingsEntityAsync(ct);

        // All deliveries for this task
        var deliveries = await _db.Deliveries
            .Include(d => d.Files)
            .AsNoTracking()
            .Where(d => d.TaskId == dispute.TaskId)
            .OrderBy(d => d.SubmittedAt)
            .ToListAsync(ct);
        var totalRevisions = await _db.Deliveries
    .CountAsync(x => x.TaskId == dispute.TaskId && x.RevisionNumber > 0, ct);
        var deliveryResponses = await Task.WhenAll(
            deliveries.Select(d => MapDeliveryAsync(d, settings.MaxRevisions, totalRevisions, ct)));

        // All revisions
        var revisions = await _db.RevisionRequests
            .AsNoTracking()
            .Where(r => r.TaskId == dispute.TaskId)
            .OrderBy(r => r.CreatedAt)
            .Select(r => new RevisionRequestResponse(
                r.RevisionId, r.DeliveryId,
                r.Reason, r.Status.ToString(), r.CreatedAt))
            .ToListAsync(ct);

        // Full audit log
        var timeline = await _audit.GetLogsAsync(
            "Delivery", dispute.DeliveryId, ct);

        // Chat history between the two parties
        var conv = await _db.ChatConversations
            .AsNoTracking()
            .FirstOrDefaultAsync(c =>
                c.TaskId == dispute.TaskId
                && c.ClientUserId == dispute.Task.ClientUserId, ct);

        var chatHistory = new List<ChatMessageSummary>();
        if (conv is not null)
        {
            chatHistory = await _db.ChatMessages
                .AsNoTracking()
                .Where(m => m.ConversationId == conv.ConversationId
                         && !m.AiFlags.Contains("\"blocked\":true"))
                .OrderBy(m => m.SentAt)
                .Select(m => new ChatMessageSummary(
                    conv.ClientUserId == m.SenderUserId ? "Client" : "Freelancer",
                    m.SanitizedContent,
                    m.SentAt))
                .ToListAsync(ct);
        }

        return new DisputeCaseResponse(
            MapDispute(dispute),
            deliveryResponses,
            revisions,
            timeline,
            chatHistory);
    }

    private async Task<DeliveryResponse> MapDeliveryAsync(
    Delivery d, int maxRevisions, int totalRevisions, CancellationToken ct)
    {

        var links = JsonSerializer.Deserialize<List<DeliveryLink>>(d.Links)
                        ?? [];
        
        return new DeliveryResponse(
            d.DeliveryId, d.TaskId,
            d.Task?.PublicTaskCode ?? string.Empty,
            d.RevisionNumber,
            d.Note,
            d.VideoUrl,
            links,
            d.Status.ToString(),
            d.SubmittedAt,
            d.ReviewDeadline,
            d.RespondedAt,
            totalRevisions,
            maxRevisions,
            d.Files.Select(f => new DeliveryFileResponse(
                f.FileId, f.OriginalFileName,
                $"/deliveries/{Path.GetFileName(f.BlobRef)}",
                f.SizeBytes, f.ContentType, f.UploadedAt)));
    }
    private static DisputeResponse MapDispute(Dispute d) => new(
        d.DisputeId, d.DeliveryId, d.TaskId,
        d.Report, d.Status.ToString(),
        d.Resolution?.ToString(), d.FreelancerAmount, d.ClientRefundAmount,
        d.AdminNotes, d.CreatedAt, d.ResolvedAt);
}