using Application.Features.Kyc.DTOs;

namespace Waseet.Application.Features.Kyc.Interfaces;

public interface IKycService
{
    Task<KycStatusResponse> SubmitAsync(Guid userId, string fullName, Stream docStream, string fileName, string contentType, CancellationToken ct = default);
    Task<KycStatusResponse> GetStatusAsync(Guid userId, CancellationToken ct = default);
    Task<IEnumerable<KycAdminListItem>> GetPendingAsync(CancellationToken ct = default);
    Task DecideAsync(Guid kycId, string decision, CancellationToken ct = default);
}