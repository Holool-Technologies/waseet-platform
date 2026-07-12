namespace Application.Features.Delivery.DTOs;

public record DeliveryFileResponse(
    Guid FileId,
    string OriginalFileName,
    string FileUrl,
    long SizeBytes,
    string ContentType,
    DateTime UploadedAt);

public record DeliveryLink(string Label, string Url);
public record DeliveryChecklistItem(string Item, bool Done);

public record DeliveryResponse(
    Guid DeliveryId,
    Guid TaskId,
    string TaskCode,
    int RevisionNumber,
    string Note,
    string? VideoUrl,
    IEnumerable<DeliveryLink> Links,
    string Status,
    DateTime SubmittedAt,
    DateTime ReviewDeadline,
    DateTime? RespondedAt,
    int TotalRevisions,
    int MaxRevisions,
    IEnumerable<DeliveryFileResponse> Files);
public record RevisionRequestResponse(
    Guid RevisionId,
    Guid DeliveryId,
    string Reason,
    string Status,
    DateTime CreatedAt);

public record DisputeResponse(
    Guid DisputeId,
    Guid DeliveryId,
    Guid TaskId,
    string Report,
    string Status,
    string? Resolution,
    decimal? FreelancerAmount,
    decimal? ClientRefundAmount,
    string AdminNotes,
    DateTime CreatedAt,
    DateTime? ResolvedAt);

public record AuditLogResponse(
    Guid LogId,
    string EventType,
    string ActorType,
    string Payload,
    DateTime OccurredAt);

public record SubmitDeliveryRequest(
    string Note);

public record RequestRevisionRequest(
    string Reason);

public record OpenDisputeRequest(
    string Report);

public record AdminResolveDisputeRequest(
    string Resolution,
    string AdminNotes,
    decimal? FreelancerAmount = null,
    decimal? ClientRefundAmount = null);

public record DeliverySettingsResponse(
    int ReviewWindowDays,
    int MaxRevisions);
public record DisputeCaseResponse(
    DisputeResponse Dispute,
    IEnumerable<DeliveryResponse> AllDeliveries,
    IEnumerable<RevisionRequestResponse> AllRevisions,
    IEnumerable<AuditLogResponse> Timeline,
    IEnumerable<ChatMessageSummary> ChatHistory
);

public record ChatMessageSummary(
    string SenderRole,
    string Content,
    DateTime SentAt
);