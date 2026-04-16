namespace Domain.Interfaces;

public interface IFileStorageService
{
    Task<string> UploadAsync(Stream fileStream, string fileName, string contentType, CancellationToken ct = default);
    Task DeleteAsync(string blobRef, CancellationToken ct = default);
}