using System.Text.Json.Serialization;

namespace Infrastructure.Services.Gemini;

// ── Request ───────────────────────────────────────────────────────────────────

/// <summary>Top-level request body sent to the Gemini generateContent endpoint.</summary>
public record GeminiRequest(
    [property: JsonPropertyName("system_instruction")]
    GeminiContent SystemInstruction,

    [property: JsonPropertyName("contents")]
    GeminiContent[] Contents,

    [property: JsonPropertyName("generationConfig")]
    GeminiGenerationConfig GenerationConfig
);

/// <summary>Represents a single content block (system or user turn).</summary>
public record GeminiContent(
    [property: JsonPropertyName("parts")]
    GeminiPart[] Parts,

    [property: JsonPropertyName("role")]
    string? Role = null
);

/// <summary>A single text part inside a content block.</summary>
public record GeminiPart(
    [property: JsonPropertyName("text")]
    string Text
);

/// <summary>Controls output format and sampling behaviour.</summary>
public record GeminiGenerationConfig(
    [property: JsonPropertyName("responseMimeType")]
    string ResponseMimeType,

    [property: JsonPropertyName("temperature")]
    float Temperature,

    [property: JsonPropertyName("maxOutputTokens")]
    int MaxOutputTokens
);

// ── Response ──────────────────────────────────────────────────────────────────

/// <summary>Top-level Gemini API response envelope.</summary>
public record GeminiResponse(
    [property: JsonPropertyName("candidates")]
    GeminiCandidate[]? Candidates,

    [property: JsonPropertyName("error")]
    GeminiError? Error
);

public record GeminiCandidate(
    [property: JsonPropertyName("content")]
    GeminiContent? Content,

    [property: JsonPropertyName("finishReason")]
    string? FinishReason
);

public record GeminiError(
    [property: JsonPropertyName("code")]
    int Code,

    [property: JsonPropertyName("message")]
    string Message,

    [property: JsonPropertyName("status")]
    string Status
);

// ── Sanitizer output ──────────────────────────────────────────────────────────

/// <summary>
/// The structured JSON object Gemini is instructed to return.
/// Maps directly to our SanitizeResult domain record.
/// </summary>
public record GeminiSanitizerOutput(
    [property: JsonPropertyName("sanitized")]
    string Sanitized,

    [property: JsonPropertyName("pii_detected")]
    bool PiiDetected,

    [property: JsonPropertyName("blocked")]
    bool Blocked,

    [property: JsonPropertyName("reason")]
    string? Reason
);