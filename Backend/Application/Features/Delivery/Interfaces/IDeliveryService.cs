using Waseet.Application.Features.Delivery.DTOs;

namespace Waseet.Application.Features.Delivery.Interfaces;

public interface IDeliveryService
{
    Task<DeliveryResponse> SubmitDeliveryAsync(
        Guid freelancerUserId, string taskCode, string note,
        List<(Stream Stream, string FileName, string ContentType)> files,
        CancellationToken ct = default);

    Task<DeliveryResponse?> GetActiveDeliveryAsync(
        string taskCode, CancellationToken ct = default);

    Task<DeliveryResponse> AcceptDeliveryAsync(
        Guid clientUserId, Guid deliveryId, CancellationToken ct = default);

    Task<DisputeResponse> ReportDeliveryAsync(
        Guid clientUserId, Guid deliveryId, string report, CancellationToken ct = default);

    Task<int> ProcessAutoReleasesAsync(CancellationToken ct = default);

    Task<IEnumerable<DisputeResponse>> GetOpenDisputesAsync(CancellationToken ct = default);

    Task<DisputeResponse> AdminResolveDisputeAsync(
        Guid adminId, Guid disputeId, string resolution, string notes,
        CancellationToken ct = default);
}