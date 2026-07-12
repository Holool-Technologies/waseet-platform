using Application.Features.Delivery.DTOs;

namespace Application.Features.Delivery.Interfaces;

public interface IDeliveryService
{
    Task<DeliveryResponse> SubmitDeliveryAsync(
        Guid freelancerUserId, string taskCode, string note, 
        string? videoUrl,List<DeliveryLink> links,
        List<(Stream Stream, string FileName, string ContentType)> files,
        CancellationToken ct = default);

    Task<DeliveryResponse?> GetActiveDeliveryAsync(
        string taskCode, Guid requestingUserId, CancellationToken ct = default);

    Task<DeliveryResponse> AcceptDeliveryAsync(
        Guid clientUserId, Guid deliveryId, CancellationToken ct = default);

    Task<RevisionRequestResponse> RequestRevisionAsync(
        Guid clientUserId, Guid deliveryId, string reason, CancellationToken ct = default);

    Task<DisputeResponse> OpenDisputeAsync(
        Guid clientUserId, Guid deliveryId, string report, CancellationToken ct = default);

    Task<int> ProcessAutoReleasesAsync(CancellationToken ct = default);

    Task<IEnumerable<DisputeResponse>> GetOpenDisputesAsync(CancellationToken ct = default);

    Task<DisputeResponse> AdminClaimDisputeAsync(
        Guid adminId, Guid disputeId, CancellationToken ct = default);

    Task<DisputeResponse> AdminResolveDisputeAsync(
        Guid adminId, Guid disputeId,
        string resolution, string notes, CancellationToken ct = default,
        decimal? freelancerAmount=null, decimal? clientRefundAmount=null
        );

    Task<IEnumerable<AuditLogResponse>> GetDeliveryAuditLogsAsync(
        Guid deliveryId, CancellationToken ct = default);
    Task<IEnumerable<DeliveryResponse>> GetDeliveryHistoryAsync(
    string taskCode, Guid requestingUserId, CancellationToken ct = default);

    Task<IEnumerable<RevisionRequestResponse>> GetRevisionRequestsAsync(
        string taskCode, Guid requestingUserId, CancellationToken ct = default);
    Task<DeliverySettingsResponse> GetSettingsAsync(CancellationToken ct = default);
    Task UpdateSettingsAsync(int reviewWindowDays, int maxRevisions, CancellationToken ct = default);

    Task<DisputeCaseResponse> GetDisputeCaseAsync(
    Guid disputeId, CancellationToken ct = default);
}