using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Domain.Interfaces;
using Infrastructure.Services.Gemini;

namespace Infrastructure.Services;

/// <summary>
/// Message sanitizer using Gemini 2.0 Flash only.
/// No regex pre-filter — Gemini handles everything.
/// Falls back to passing the message through unchanged if Gemini is unavailable.
/// </summary>
public class AiSanitizerService : IAiSanitizerService
{
    private readonly HttpClient _http;
    private readonly string _apiKey;
    private readonly string _model;
    private readonly bool _aiEnabled;
    private readonly ILogger<AiSanitizerService> _logger;

    private const string EndpointTemplate =
        "https://generativelanguage.googleapis.com/v1beta/models/{0}:generateContent?key={1}";

    private const string SystemPrompt = """
        You are a strict identity-neutral communication sanitizer for a double-blind freelance platform.
        Your ONLY job is to sanitize messages so users cannot identify, emotionally bond with, or socially interact with each other outside professional task communication.

        Rules (apply to ALL languages, especially Arabic and its dialects):

        1. Remove all personal identity indicators:
           - names, usernames, emails, phone numbers, social handles, company names, locations, external links, website URLs

        2. Remove all social and emotional language:
           - greetings (e.g. السلام عليكم, hi, hello, good morning)
           - religious phrases (e.g. بسم الله, إن شاء الله used socially, جزاك الله)
           - compliments, flirting, friendliness, emotional tone
           - relationship-building language (e.g. يسعدني التعامل معك شخصياً)

        3. Remove all gender indicators and personal pronouns whenever possible.

        4. Remove all requests for off-platform communication:
           - mentions of WhatsApp, Telegram, Instagram, Snapchat, phone calls, emails, any external contact method
           - phrases like: تواصل معي, كلمني, ابعتلي, راسلني, call me, contact me, reach me outside

        5. Preserve ONLY task-related and technical meaning:
           - keep technical specifications, code snippets, file names, API routes, stack traces, deadlines, deliverables, pricing discussion related to the task

        6. Never modify:
           - code blocks, programming terms, technical file names, API routes, stack traces

        7. If the message is ENTIRELY social with zero task-related content (e.g. only a greeting, only flirting, only a contact request):
           - set "blocked": true
           - set "sanitized": ""

        8. If the message attempts identity exchange, off-platform contact, or social interaction mixed with task content:
           - remove the social parts
           - keep only the task parts
           - set "pii_detected": true
           - set "blocked": false

        9. Output ONLY valid JSON. No markdown. No explanation. No extra text before or after.

        Response format must be exactly:
        {"sanitized":"","pii_detected":false,"blocked":false,"reason":""}
        """;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private const int MaxRetries = 3;
    private const int BaseDelayMs = 2000;

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
                "AiSanitizerService ready — model: {Model}", _model);
        else
            _logger.LogWarning(
                "Gemini:ApiKey not configured — sanitizer will pass messages through unchanged.");
    }

    /// <summary>
    /// Sanitizes a message using Gemini.
    /// If Gemini is unavailable, returns the original message unchanged (safe fallback).
    /// Never throws.
    /// </summary>
    public async Task<SanitizeResult> SanitizeAsync(
        string message, CancellationToken ct = default)
    {

        // Empty guard
        if (string.IsNullOrWhiteSpace(message))
            return new SanitizeResult(message, false, false, string.Empty);

        // AI not configured — pass through unchanged
        if (!_aiEnabled)
        {
            _logger.LogWarning(
                "AI sanitizer disabled — message passed through without sanitization.");
            return new SanitizeResult(message, false, false,
                "AI sanitizer not configured.");
        }

        // Call Gemini with retry
        try
        {
            var result = await CallGeminiAsync(message, ct);

            if (result is not null)
            {
                _logger.LogDebug(
                    "Gemini sanitized — pii:{Pii} blocked:{Blocked}",
                    result.PiiDetected, result.Blocked);

                return new SanitizeResult(
                    SanitizedContent: result.Sanitized ?? message,
                    PiiDetected: result.PiiDetected,
                    Blocked: result.Blocked,
                    Reason: result.Reason ?? string.Empty);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AiSanitizerService: Gemini call threw an exception.");
        }

        // Gemini failed — pass original message through unchanged
        // Better to let the message through than silently block communication
        _logger.LogWarning(
            "Gemini unavailable — message passed through without sanitization.");

        return new SanitizeResult(
            SanitizedContent: message,
            PiiDetected: false,
            Blocked: false,
            Reason: "AI unavailable — message passed through.");
    }

    // ── Gemini HTTP call with retry ───────────────────────────────────────────

    private async Task<GeminiSanitizerOutput?> CallGeminiAsync(
        string message, CancellationToken ct)
    {
        var endpoint = string.Format(EndpointTemplate, _model, _apiKey);

        var requestBody = new GeminiRequest(
            SystemInstruction: new GeminiContent(
                Parts: [new GeminiPart(SystemPrompt)]
            ),
            Contents:
            [
                new GeminiContent(
                    Role: "user",
                    Parts: [new GeminiPart(message)]
                )
            ],
            GenerationConfig: new GeminiGenerationConfig(
                ResponseMimeType: "application/json",
                Temperature: 0.0f,
                MaxOutputTokens: 512
            )
        );

        var json = JsonSerializer.Serialize(requestBody, JsonOpts);

        for (int attempt = 1; attempt <= MaxRetries; attempt++)
        {
            ct.ThrowIfCancellationRequested();

            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            using var response = await _http.PostAsync(endpoint, content, ct);

            // Success
            if (response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(ct);
                return ParseResponse(body);
            }

            var status = (int)response.StatusCode;

            // Retryable: 429 or 503
            if (status == 429 || status == 503)
            {
                if (attempt == MaxRetries)
                {
                    _logger.LogWarning(
                        "Gemini {Status} on final attempt {A}/{M} — giving up.",
                        status, attempt, MaxRetries);
                    return null;
                }

                int delay = CalculateDelay(response, attempt);
                _logger.LogWarning(
                    "Gemini {Status} on attempt {A}/{M} — retrying in {D}ms.",
                    status, attempt, MaxRetries, delay);
                await Task.Delay(delay, ct);
                continue;
            }

            // Non-retryable
            var errorBody = await response.Content.ReadAsStringAsync(ct);
            _logger.LogError(
                "Gemini non-retryable {Status}: {Body}",
                status, errorBody[..Math.Min(300, errorBody.Length)]);
            return null;
        }

        return null;
    }

    // ── Parse Gemini response envelope ────────────────────────────────────────

    private GeminiSanitizerOutput? ParseResponse(string responseJson)
    {
        GeminiResponse? envelope;
        try
        {
            envelope = JsonSerializer.Deserialize<GeminiResponse>(responseJson, JsonOpts);
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to parse Gemini envelope.");
            return null;
        }

        if (envelope?.Error is not null)
        {
            _logger.LogError(
                "Gemini error {Code} [{Status}]: {Message}",
                envelope.Error.Code,
                envelope.Error.Status,
                envelope.Error.Message);
            return null;
        }

        var rawText = envelope
            ?.Candidates
            ?.FirstOrDefault()
            ?.Content
            ?.Parts
            ?.FirstOrDefault()
            ?.Text;

        if (string.IsNullOrWhiteSpace(rawText))
        {
            _logger.LogWarning("Gemini returned empty text.");
            return null;
        }

        return ParseSanitizerOutput(rawText);
    }

    // ── Parse the sanitizer JSON from Gemini's text output ───────────────────

    private GeminiSanitizerOutput? ParseSanitizerOutput(string raw)
    {
        var cleaned = raw.Trim();

        // Strip markdown fences if model wraps despite instruction
        if (cleaned.StartsWith("```"))
        {
            var firstNewline = cleaned.IndexOf('\n');
            if (firstNewline > 0)
                cleaned = cleaned[(firstNewline + 1)..];
            if (cleaned.TrimEnd().EndsWith("```"))
                cleaned = cleaned[..cleaned.LastIndexOf("```")].Trim();
        }

        cleaned = cleaned.Trim('`').Trim();

        try
        {
            var output = JsonSerializer.Deserialize<GeminiSanitizerOutput>(
                cleaned, JsonOpts);

            if (output is null)
            {
                _logger.LogWarning("Gemini output parsed to null. Raw: {Raw}", raw);
                return null;
            }

            // If sanitized is null/empty but not blocked — something went wrong
            if (!output.Blocked && string.IsNullOrWhiteSpace(output.Sanitized))
            {
                _logger.LogWarning(
                    "Gemini returned empty sanitized field without blocking. Raw: {Raw}", raw);
                return null;
            }

            return output;
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Gemini output is not valid JSON. Raw: {Raw}", raw);
            return null;
        }
    }

    // ── Retry delay calculation ───────────────────────────────────────────────

    private static int CalculateDelay(HttpResponseMessage response, int attempt)
    {
        if (response.Headers.RetryAfter?.Delta is TimeSpan delta)
            return (int)delta.TotalMilliseconds + 500;

        if (response.Headers.RetryAfter?.Date is DateTimeOffset retryDate)
        {
            var wait = (int)(retryDate - DateTimeOffset.UtcNow).TotalMilliseconds;
            if (wait > 0) return wait + 500;
        }

        // Exponential backoff with jitter: 2s → 4s → 8s
        return BaseDelayMs * (int)Math.Pow(2, attempt - 1)
             + Random.Shared.Next(0, 500);
    }
}