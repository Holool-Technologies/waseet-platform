using Microsoft.EntityFrameworkCore;
using Application.Features.Kyc.DTOs;
using Application.Features.Kyc.Interfaces;
using Domain.Entities;
using Domain.Interfaces;
using Infrastructure.Persistence;

namespace Infrastructure.Services;

public class KycService : IKycService
{
    private readonly WaseetDbContext _db;
    private readonly IFileStorageService _storage;
    private readonly EncryptionService _encryption;

    public KycService(
        WaseetDbContext db,
        IFileStorageService storage,
        EncryptionService encryption)
    {
        _db = db;
        _storage = storage;
        _encryption = encryption;
    }

    public async Task<KycStatusResponse> SubmitAsync(
        Guid userId,
        string fullName,
        Stream docStream,
        string fileName,
        string contentType,
        CancellationToken ct = default)
    {
        // Prevent duplicate submissions
        var existing = await _db.KycRecords
            .FirstOrDefaultAsync(k => k.UserId == userId, ct);

        if (existing is not null)
            throw new InvalidOperationException("KYC already submitted.");

        var blobRef = await _storage.UploadAsync(docStream, fileName, contentType, ct);
        var encryptedName = _encryption.Encrypt(fullName);

        var record = new KycRecord
        {
            UserId = userId,
            FullNameEncrypted = encryptedName,
            DocumentBlobRef = blobRef,
            Status = Domain.Enums.KycStatus.Pending
        };

        _db.KycRecords.Add(record);
        await _db.SaveChangesAsync(ct);

        return new KycStatusResponse(
            record.KycId,
            record.Status.ToString(),
            record.SubmittedAt,
            record.VerifiedAt
        );
    }

    public async Task<KycStatusResponse> GetStatusAsync(
        Guid userId,
        CancellationToken ct = default)
    {
        var record = await _db.KycRecords
            .FirstOrDefaultAsync(k => k.UserId == userId, ct)
            ?? throw new KeyNotFoundException("No KYC record found.");

        return new KycStatusResponse(
            record.KycId,
            record.Status.ToString(),
            record.SubmittedAt,
            record.VerifiedAt
        );
    }

    public async Task<IEnumerable<KycAdminListItem>> GetPendingAsync(
        CancellationToken ct = default)
    {
        return await _db.KycRecords
            .Where(k => k.Status == Domain.Enums.KycStatus.Pending)
            .OrderBy(k => k.SubmittedAt)
            .Select(k => new KycAdminListItem(
                k.KycId,
                k.UserId,
                k.Status.ToString(),
                k.SubmittedAt,
                k.DocumentBlobRef
            ))
            .ToListAsync(ct);
    }

    public async Task DecideAsync(
        Guid kycId,
        string decision,
        CancellationToken ct = default)
    {
        var record = await _db.KycRecords
            .Include(k => k.User)
            .FirstOrDefaultAsync(k => k.KycId == kycId, ct)
            ?? throw new KeyNotFoundException("KYC record not found.");

        record.Status = decision.ToLower() == "approve"
            ? Domain.Enums.KycStatus.Approved
            : Domain.Enums.KycStatus.Rejected;

        record.VerifiedAt = DateTime.UtcNow;

        // Sync status on User entity too
        record.User.KycStatus = record.Status;

        await _db.SaveChangesAsync(ct);
    }
}