using Domain.Interfaces;

namespace Infrastructure.Services;

public class LocalFileStorageService : IFileStorageService
{
    private readonly string _basePath;

    public LocalFileStorageService()
    {
        _basePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "kyc-docs");
        Directory.CreateDirectory(_basePath);
    }

    public async Task<string> UploadAsync(
        Stream fileStream,
        string fileName,
        string contentType,
        CancellationToken ct = default)
    {
        var ext = Path.GetExtension(fileName);
        var uniqueName = $"{Guid.NewGuid()}{ext}";
        var fullPath = Path.Combine(_basePath, uniqueName);

        await using var fs = new FileStream(fullPath, FileMode.Create);
        await fileStream.CopyToAsync(fs, ct);

        return $"kyc-docs/{uniqueName}";
    }

    public Task DeleteAsync(string blobRef, CancellationToken ct = default)
    {
        var fullPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", blobRef);
        if (File.Exists(fullPath)) File.Delete(fullPath);
        return Task.CompletedTask;
    }
}