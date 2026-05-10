using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Infrastructure.Services.Gemini;

namespace Infrastructure.Services;

public record BioFilterResult(string FilteredBio, bool WasModified);

/// <summary>
/// Filters freelancer bios through Gemini to enforce:
/// - professional, formal tone
/// - neutral, impersonal language (no I/me/my, no names)
/// - removal of contact info and social identifiers
/// Uses the same HttpClient as the main AI sanitizer.
/// </summary>
public class BioFilterService
{
    private readonly HttpClient _http;
    private readonly string _apiKey;
    private readonly string _model;
    private readonly bool _enabled;
    private readonly ILogger<BioFilterService> _logger;

    private const string EndpointTemplate =
        "https://generativelanguage.googleapis.com/v1beta/models/{0}:generateContent?key={1}";

    private const string BioSystemPrompt = """
        You are a professional bio editor for a double-blind freelance platform.
        Rewrite the provided bio to:
        1. Be professional and formal in tone.
        2. Use neutral, impersonal language — no "I", "my", "me", "we", personal names, or pronouns.
        3. Focus only on skills, experience, and professional capabilities.
        4. Remove any contact information, social media handles, or personal identifiers.
        5. Keep it concise (maximum 300 words).
        6. Preserve all technical skills and domain expertise.

        Return ONLY the rewritten bio text.
        No explanation. No quotes. No markdown. No JSON wrapper.
        If the input is already fully appropriate, return it unchanged.
        """;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public BioFilterService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<BioFilterService> logger)
    {
        _logger = logger;
        _http = httpClientFactory.CreateClient("Gemini");
        _apiKey = configuration["Gemini:ApiKey"] ?? string.Empty;
        _model = configuration["Gemini:Model"] ?? "gemini-2.0-flash";
        _enabled = !string.IsNullOrWhiteSpace(_apiKey);
    }

    public async Task<BioFilterResult> FilterAsync(
        string rawBio, CancellationToken ct = default)
    {
        if (!_enabled || string.IsNullOrWhiteSpace(rawBio))
            return new BioFilterResult(rawBio, false);

        try
        {
            var endpoint = string.Format(EndpointTemplate, _model, _apiKey);

            var requestBody = new GeminiRequest(
                SystemInstruction: new GeminiContent(
                    Parts: [new GeminiPart(BioSystemPrompt)]
                ),
                Contents:
                [
                    new GeminiContent(
                        Role: "user",
                        Parts: [new GeminiPart(rawBio)]
                    )
                ],
                GenerationConfig: new GeminiGenerationConfig(
                    ResponseMimeType: "text/plain",
                    Temperature: 0.3f,
                    MaxOutputTokens: 600
                )
            );

            var json = JsonSerializer.Serialize(requestBody, JsonOpts);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            using var response = await _http.PostAsync(endpoint, content, ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Bio filter Gemini call failed: {Status}",
                    response.StatusCode);
                return new BioFilterResult(rawBio, false);
            }

            var responseJson = await response.Content.ReadAsStringAsync(ct);
            var envelope = JsonSerializer.Deserialize<GeminiResponse>(
                responseJson, JsonOpts);

            var filtered = envelope
                ?.Candidates
                ?.FirstOrDefault()
                ?.Content
                ?.Parts
                ?.FirstOrDefault()
                ?.Text
                ?.Trim();

            if (string.IsNullOrWhiteSpace(filtered))
                return new BioFilterResult(rawBio, false);

            bool wasModified = !string.Equals(
                filtered, rawBio, StringComparison.OrdinalIgnoreCase);

            return new BioFilterResult(filtered, wasModified);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Bio filter failed — returning original bio.");
            return new BioFilterResult(rawBio, false);
        }
    }
}