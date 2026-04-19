namespace Domain.Interfaces;

public record SanitizeResult(
    string SanitizedContent,
    bool PiiDetected,
    bool Blocked,
    string Reason
);

public interface IAiSanitizerService
{
    Task<SanitizeResult> SanitizeAsync(string message, CancellationToken ct = default);
}