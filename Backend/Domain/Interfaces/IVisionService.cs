namespace Domain.Interfaces;

public record VisionResult(bool HumanDetected, double Confidence, string[] DetectedCategories);

public interface IVisionService
{
    Task<VisionResult> AnalyzeImageAsync(Stream imageStream, CancellationToken ct = default);
}