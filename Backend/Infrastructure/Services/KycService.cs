using Application.Features.Kyc.DTOs;
using Application.Features.Kyc.Interfaces;
using Domain.Entities;
using Domain.Interfaces;
using Application.Features.Notifications.Interfaces;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Task = System.Threading.Tasks.Task;



namespace Infrastructure.Services;

public class KycService : IKycService
{
    private readonly WaseetDbContext _db;
    private readonly IFileStorageService _storage;
    private readonly EncryptionService _encryption;
    private readonly INotificationService _notifications;

    public KycService(
        WaseetDbContext db,
        IFileStorageService storage,
        EncryptionService encryption,
        INotificationService notifications)
    {
        _db = db;
        _storage = storage;
        _encryption = encryption;
        _notifications = notifications;
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

        if (existing is not null && existing.Status == Domain.Enums.KycStatus.Approved)
            throw new InvalidOperationException("KYC already submitted.");

        var blobRef = await _storage.UploadAsync(docStream, fileName, contentType, folder: "kyc-docs", ct);
        var encryptedName = _encryption.Encrypt(fullName);
        //_db.KycRecords.RemoveRange(_db.KycRecords.Where(k => k.UserId == userId)); // Remove old records if any
        //await _db.SaveChangesAsync(ct); // Ensure old records are removed before adding new one
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
     Guid kycId, string decision, CancellationToken ct = default)
    {
        var record = await _db.KycRecords
            .Include(k => k.User)
            .FirstOrDefaultAsync(k => k.KycId == kycId, ct)
            ?? throw new KeyNotFoundException("KYC record not found.");

        record.Status = decision.ToLower() == "approve"
            ? Domain.Enums.KycStatus.Approved
            : Domain.Enums.KycStatus.Rejected;

        record.VerifiedAt = DateTime.UtcNow;
        record.User.KycStatus = record.Status;

        await _db.SaveChangesAsync(ct);

        // ? Notify the USER whose KYC was decided — NOT the admin
        if (record.Status == Domain.Enums.KycStatus.Approved)
        {
            await _notifications.CreateAndPushAsync(
                record.UserId,  // <-- the freelancer/client, NOT adminId
                Domain.Enums.NotificationType.KycApproved,
                "Identity Verified",
                "Êã ÇáÊÍÞÞ ãä åæíÊß",
                "Your identity has been verified. You can now post and bid on tasks.",
                "Êã ÇáÊÍÞÞ ãä åæíÊß. íãßäß ÇáÂä äÔÑ ÇáãåÇã æÇáãÒÇíÏÉ ÚáíåÇ.",
                kycId.ToString(), "/kyc", ct);
        }
        else
        {
            await _notifications.CreateAndPushAsync(
                record.UserId,  // <-- the user, NOT admin
                Domain.Enums.NotificationType.KycRejected,
                "Verification Failed",
                "ÝÔá ÇáÊÍÞÞ ãä ÇáåæíÉ",
                "Your identity verification was not approved. Please resubmit with clearer documents.",
                "áã ÊÊã ÇáãæÇÝÞÉ Úáì ÇáÊÍÞÞ ãä åæíÊß. íÑÌì ÅÚÇÏÉ ÇáÊÞÏíã ÈãÓÊäÏÇÊ ÃæÖÍ.",
                kycId.ToString(), "/kyc", ct);
        }
    }
}