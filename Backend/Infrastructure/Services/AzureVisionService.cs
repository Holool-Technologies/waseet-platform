using Azure;
using Azure.AI.Vision.ImageAnalysis;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Domain.Interfaces;

namespace Infrastructure.Services;

public class AzureVisionService : IVisionService
{
    private readonly ImageAnalysisClient? _client;
    private readonly ILogger<AzureVisionService> _logger;
    private readonly bool _enabled;

    // Categories that indicate human presence
    private static readonly HashSet<string> HumanCategories = new(StringComparer.OrdinalIgnoreCase)
    {
        "people", "person", "face", "human", "man", "woman",
        "child", "crowd", "portrait", "selfie", "body"
    };

    public AzureVisionService(IConfiguration config, ILogger<AzureVisionService> logger)
    {
        _logger = logger;
        var endpoint = config["AzureVision:Endpoint"];
        var apiKey = config["AzureVision:ApiKey"];

        if (!string.IsNullOrWhiteSpace(endpoint) && !string.IsNullOrWhiteSpace(apiKey))
        {
            _client = new ImageAnalysisClient(new Uri(endpoint), new AzureKeyCredential(apiKey));
            _enabled = true;
        }
        else
        {
            _logger.LogWarning("Azure Vision not configured — all images will be queued for manual admin review.");
        }
    }

    public async Task<VisionResult> AnalyzeImageAsync(Stream imageStream, CancellationToken ct = default)
    {
        if (!_enabled || _client is null)
            return new VisionResult(false, 0, []);

        try
        {
            var result = await _client.AnalyzeAsync(
                BinaryData.FromStream(imageStream),
                VisualFeatures.Tags | VisualFeatures.People,
                cancellationToken: ct);

            // Check People detection (direct bounding boxes)
            bool hasDetectedPeople = result.Value.People?.Values
                .Any(p => p.Confidence > 0.6) ?? false;

            // Check Tags for human-related categories
            var humanTags = result.Value.Tags?.Values
                .Where(t => HumanCategories.Contains(t.Name) && t.Confidence > 0.7)
                .Select(t => t.Name)
                .ToArray() ?? [];

            bool humanDetected = hasDetectedPeople || humanTags.Length > 0;
            double confidence = hasDetectedPeople
                ? result.Value.People!.Values.Max(p => p.Confidence)
                : humanTags.Length > 0 ? 0.8 : 0;

            return new VisionResult(humanDetected, confidence, humanTags);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Vision analysis failed — flagging for manual review.");
            // On failure — flag as pending, let admin review manually
            return new VisionResult(false, 0, []);
        }
    }
}