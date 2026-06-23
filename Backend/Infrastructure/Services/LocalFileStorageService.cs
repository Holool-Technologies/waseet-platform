using Domain.Interfaces;

namespace Infrastructure.Services;

public class LocalFileStorageService : IFileStorageService
{
    private readonly string _wwwRoot;

    public LocalFileStorageService()
    {
        _wwwRoot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");

        // Pre-create all known folders
        Directory.CreateDirectory(Path.Combine(_wwwRoot, "portfolio"));
    }

    public async Task<string> UploadAsync(
        Stream fileStream,
        string fileName,
        string contentType,
        string folder = "uploads",
        CancellationToken ct = default)
    {
        // Sanitize folder name — prevent directory traversal
        var safeFolder = Path.GetFileName(folder);
        var folderPath = Path.Combine(_wwwRoot, safeFolder);
        Directory.CreateDirectory(folderPath);

        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        var uniqueName = $"{Guid.NewGuid()}{ext}";
        var fullPath = Path.Combine(folderPath, uniqueName);

        await using var fs = new FileStream(fullPath, FileMode.Create);
        await fileStream.CopyToAsync(fs, ct);

        // Return relative path from wwwroot — e.g. "
        // docs/abc.pdf"
        return $"{safeFolder}/{uniqueName}";
    }

    public Task DeleteAsync(string blobRef, CancellationToken ct = default)
    {
        var fullPath = Path.Combine(_wwwRoot, blobRef.TrimStart('/'));
        if (File.Exists(fullPath))
            File.Delete(fullPath);
        return Task.CompletedTask;
    }
}