using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Domain.Interfaces;
using Infrastructure.Services.Gemini;

namespace Infrastructure.Services;

/// <summary>
/// Production-grade message sanitizer using:
/// 1. Regex first pass  — free, instant, no network
/// 2. Gemini 2.0 Flash  — deep semantic PII + social language removal
/// 3. Regex fallback    — if Gemini is unavailable or returns invalid response
///
/// Uses HttpClient only — no OpenAI or Azure SDK dependencies.
/// </summary>
public class AiSanitizerService : IAiSanitizerService
{
    private readonly HttpClient _http;
    private readonly string _apiKey;
    private readonly string _model;
    private readonly bool _aiEnabled;
    private readonly ILogger<AiSanitizerService> _logger;

    // ── Gemini endpoint template ──────────────────────────────────────────────
    private const string EndpointTemplate =
        "https://generativelanguage.googleapis.com/v1beta/models/{0}:generateContent?key={1}";

    // ── System prompt ─────────────────────────────────────────────────────────
    // Instructs Gemini to act as a strict identity-neutral sanitizer.
    // The output format is enforced via responseMimeType = "application/json".
    private const string SystemPrompt = """
        You are a strict identity-neutral communication sanitizer for a double-blind freelance platform.
        Your ONLY job is to sanitize messages so users cannot identify, emotionally bond with, or socially interact with each other outside professional task communication.
        Rules (apply to ALL languages, especially Arabic dialects):

        1. Remove all personal identity indicators:
           - names, usernames, emails, phone numbers, social handles, company names, locations, external links

        2. Remove all social and emotional language:
           - greetings, religious phrases, compliments, flirting, friendliness, emotional tone, relationship-building language

        3. Remove all gender indicators and personal pronouns whenever possible.

        4. Remove all requests for off-platform communication.

        5. Preserve ONLY the task-related and technical meaning.

        6. Never modify:
           - code snippets, stack traces, technical specifications, filenames, API routes, programming terms

        7. If the message attempts social interaction, flirting, identity exchange, or external contact then set "blocked": true.

        8. Output ONLY valid JSON. No markdown. No explanation. No extra text.

        Response format:
        {"sanitized":"","pii_detected":true,"blocked":false,"reason":""}
        """;

    // ── JSON options — case-insensitive for resilience ────────────────────────
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public AiSanitizerService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<AiSanitizerService> logger)
    {
        _logger = logger;
        _http = httpClientFactory.CreateClient("Gemini");

        _apiKey = configuration["Gemini:ApiKey"] ?? string.Empty;
        _model = configuration["Gemini:Model"] ?? "gemini-2.0-flash";

        _aiEnabled = !string.IsNullOrWhiteSpace(_apiKey);

        if (_aiEnabled)
            _logger.LogInformation(
                "AI sanitizer initialised — model: {Model}", _model);
        else
            _logger.LogWarning(
                "Gemini:ApiKey not configured — AI sanitizer running in regex-only mode.");
    }

    /// <summary>
    /// Main entry point. Runs regex → AI (if needed) → fallback.
    /// Never throws; always returns a usable SanitizeResult.
    /// </summary>
    public async Task<SanitizeResult> SanitizeAsync(
        string message, CancellationToken ct = default)
    {
        // ── 1. Empty / null guard ─────────────────────────────────────────────
        if (string.IsNullOrWhiteSpace(message))
            return new SanitizeResult(message, false, false, string.Empty);

        // ── 2. Regex first pass ───────────────────────────────────────────────
        // Fast, free, no network. Catches clear-cut PII and off-platform attempts.
        var regex = RegexPiiFilter.Process(message);

        if (regex.ShouldBlock)
        {
            _logger.LogInformation(
                "Message blocked by regex filter. Reason: {Reason}", regex.BlockReason);

            return new SanitizeResult(
                SanitizedContent: "[Message blocked — off-platform contact attempt detected]",
                PiiDetected: true,
                Blocked: true,
                Reason: regex.BlockReason
            );
        }

        // ── 3. Decide whether to invoke AI ────────────────────────────────────
        // Only call Gemini when:
        //  - AI is configured
        //  - Regex found PII (needs deeper rewrite), OR
        //  - Message is long enough that regex alone might miss semantic PII
        bool shouldCallAi = _aiEnabled
            && (regex.PiiFound || message.Length > 60);

        if (!shouldCallAi)
        {
            // Regex is sufficient — return its result
            return new SanitizeResult(
                SanitizedContent: regex.Cleaned,
                PiiDetected: regex.PiiFound,
                Blocked: false,
                Reason: regex.PiiFound
                    ? "PII detected and redacted by regex filter."
                    : string.Empty
            );
        }

        // ── 4. Call Gemini ────────────────────────────────────────────────────
        try
        {
            var geminiResult = await CallGeminiAsync(regex.Cleaned, ct);

            if (geminiResult is not null)
            {
                _logger.LogDebug(
                    "Gemini sanitizer returned — pii:{Pii} blocked:{Blocked}",
                    geminiResult.PiiDetected, geminiResult.Blocked);

                return new SanitizeResult(
                    SanitizedContent: geminiResult.Sanitized ?? regex.Cleaned,
                    PiiDetected: geminiResult.PiiDetected || regex.PiiFound,
                    Blocked: geminiResult.Blocked,
                    Reason: geminiResult.Reason ?? string.Empty
                );
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Gemini API call failed — falling back to regex result.");
        }

        // ── 5. Fallback to regex result ───────────────────────────────────────
        _logger.LogWarning("Using regex-only fallback for message sanitization.");

        return new SanitizeResult(
            SanitizedContent: regex.Cleaned,
            PiiDetected: regex.PiiFound,
            Blocked: false,
            Reason: "AI unavailable — regex fallback applied."
        );
    }

    // ── Private: Gemini HTTP call ─────────────────────────────────────────────

    /// <summary>
    /// Builds and sends the Gemini generateContent request.
    /// Returns null if the response cannot be parsed into a valid sanitizer output.
    /// </summary>
    private async Task<GeminiSanitizerOutput?> CallGeminiAsync(
        string regexCleanedMessage, CancellationToken ct)
    {
        var endpoint = string.Format(EndpointTemplate, _model, _apiKey);

        // Build the strongly-typed request body
        var requestBody = new GeminiRequest(
            SystemInstruction: new GeminiContent(
                Parts: [new GeminiPart(SystemPrompt)]
            ),
            Contents:
            [
                new GeminiContent(
                    Role: "user",
                    Parts: [new GeminiPart(regexCleanedMessage)]
                )
            ],
            GenerationConfig: new GeminiGenerationConfig(
                ResponseMimeType: "application/json",  // force JSON output
                Temperature: 0.0f,                // deterministic output
                MaxOutputTokens: 512
            )
        );

        // Serialize with camelCase to match Gemini API expectations
        var json = JsonSerializer.Serialize(requestBody, JsonOpts);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        using var response = await _http.PostAsync(endpoint, content, ct);

        // ── 4a. Handle HTTP errors ────────────────────────────────────────────
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(ct);
            _logger.LogError(
                "Gemini API returned {Status}: {Body}",
                (int)response.StatusCode, errorBody);
            return null;
        }

        // ── 4b. Parse response envelope ───────────────────────────────────────
        var responseJson = await response.Content.ReadAsStringAsync(ct);

        GeminiResponse? geminiResponse;
        try
        {
            geminiResponse = JsonSerializer.Deserialize<GeminiResponse>(
                responseJson, JsonOpts);
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex,
                "Failed to deserialise Gemini envelope. Raw: {Raw}", responseJson);
            return null;
        }

        if (geminiResponse?.Error is not null)
        {
            _logger.LogError(
                "Gemini API error {Code} [{Status}]: {Message}",
                geminiResponse.Error.Code,
                geminiResponse.Error.Status,
                geminiResponse.Error.Message);
            return null;
        }

        // ── 4c. Extract the text content from the first candidate ─────────────
        var rawText = geminiResponse
            ?.Candidates
            ?.FirstOrDefault()
            ?.Content
            ?.Parts
            ?.FirstOrDefault()
            ?.Text;

        if (string.IsNullOrWhiteSpace(rawText))
        {
            _logger.LogWarning("Gemini returned empty candidate text.");
            return null;
        }

        // ── 4d. Parse the sanitizer JSON output ───────────────────────────────
        return ParseSanitizerOutput(rawText);
    }

    // ── Private: parse Gemini text output ─────────────────────────────────────

    /// <summary>
    /// Robustly parses the JSON output from Gemini.
    /// Handles:
    ///  - clean JSON            {"sanitized": "...", ...}
    ///  - markdown-wrapped JSON ```json\n{...}\n```
    ///  - leading/trailing whitespace
    /// Returns null if parsing fails.
    /// </summary>
    private GeminiSanitizerOutput? ParseSanitizerOutput(string raw)
    {
        // Strip markdown code fences if model wraps despite instruction
        var cleaned = raw.Trim();

        if (cleaned.StartsWith("```"))
        {
            // Remove opening fence line
            var firstNewline = cleaned.IndexOf('\n');
            if (firstNewline > 0)
                cleaned = cleaned[(firstNewline + 1)..];

            // Remove closing fence
            if (cleaned.EndsWith("```"))
                cleaned = cleaned[..^3].Trim();
        }

        // Strip any stray backticks
        cleaned = cleaned.Trim('`').Trim();

        try
        {
            var output = JsonSerializer.Deserialize<GeminiSanitizerOutput>(
                cleaned, JsonOpts);

            if (output is null || string.IsNullOrWhiteSpace(output.Sanitized))
            {
                _logger.LogWarning(
                    "Gemini output parsed but sanitized field is empty. Raw: {Raw}", raw);
                return null;
            }

            return output;
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex,
                "Gemini output is not valid JSON. Raw: {Raw}", raw);
            return null;
        }
    }
}