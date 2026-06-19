namespace Waseet.Application.Features.Delivery.DTOs;

public record DeliveryFileResponse(
    Guid FileId, string FileName, string FileUrl,
    long SizeBytes, string ContentType, DateTime UploadedAt);

public record DeliveryResponse(
    Guid DeliveryId, Guid TaskId, Guid FreelancerUserId,
    string Note, string Status, DateTime SubmittedAt,
    DateTime ReviewDeadline, DateTime? RespondedAt,
    IEnumerable<DeliveryFileResponse> Files);

public record SubmitReportRequest(string Report);

public record DisputeResponse(
    Guid DisputeId, Guid DeliveryId, Guid TaskId,
    string Report, string Status,
    string? Resolution, string AdminNotes,
    DateTime CreatedAt, DateTime? ResolvedAt);

public record AdminResolveDisputeRequest(string Resolution, string AdminNotes);