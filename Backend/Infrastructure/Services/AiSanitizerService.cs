using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using OpenAI.Chat;
using System.Text.Json;
using Domain.Interfaces;

namespace Infrastructure.Services;

public class AiSanitizerService : IAiSanitizerService
{
    private readonly ChatClient? _chatClient;
    private readonly ILogger<AiSanitizerService> _logger;
    private readonly bool _aiEnabled;

    private const string SystemPrompt = """
        You are a strict PII sanitizer for a double-blind freelance platform.
        Your ONLY job is to sanitize chat messages so neither party can identify the other.

        Rules:
        1. Replace any real name, email, phone, URL, social handle, company name with [REDACTED].
        2. If the message attempts to establish off-platform contact, set blocked=true.
        3. Preserve the original meaning and technical content exactly.
        4. Never alter code snippets, file names, or task-related technical details.

        Respond ONLY with valid JSON — no markdown, no explanation:
        {"sanitized":"<cleaned message>","pii_detected":true/false,"blocked":true/false,"reason":"<brief reason or empty string>"}
        """;

    public AiSanitizerService(IConfiguration config, ILogger<AiSanitizerService> logger)
    {
        _logger = logger;
        var apiKey = config["OpenAI:ApiKey"] ?? config["AzureOpenAI:ApiKey"];

        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            try
            {
                _chatClient = new ChatClient("gpt-4o-mini", new System.ClientModel.ApiKeyCredential(apiKey));
                _aiEnabled = true;
                _logger.LogInformation("AI sanitizer: OpenAI enabled.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to initialize OpenAI client");
                _aiEnabled = false;
                _chatClient = null;
            }
        }
        else
        {
            _aiEnabled = false;
            _chatClient = null;
            _logger.LogWarning("AI sanitizer: OpenAI not configured — using regex fallback only.");
        }
    }

    public async Task<SanitizeResult> SanitizeAsync(string message, CancellationToken ct = default)
    {
        // Step 1: Always run regex first — free and instant
        var (regexCleaned, piiFound, blocked) = RegexPiiFilter.Process(message);

        // If blocked by regex — no need to call AI
        if (blocked)
        {
            return new SanitizeResult(
                SanitizedContent: "[Message blocked — off-platform contact attempt detected]",
                PiiDetected: true,
                Blocked: true,
                Reason: "Attempted off-platform contact"
            );
        }

        // Step 2: If AI is enabled and regex found PII or message is long enough to warrant a check
        if (_aiEnabled && _chatClient is not null && (piiFound || message.Length > 80))
        {
            try
            {
                var messages = new List<ChatMessage>
                {
                    ChatMessage.CreateSystemMessage(SystemPrompt),
                    ChatMessage.CreateUserMessage(regexCleaned)
                };

                var chatCompletion = await _chatClient.CompleteChatAsync(
                    messages,
                    new ChatCompletionOptions
                    {
                        Temperature = 0,
                        MaxOutputTokenCount = 500
                    },
                    cancellationToken: ct
                );

                var json = chatCompletion.Value.Content[0].Text.Trim();

                // Strip markdown fences if model wraps in ```json
                if (json.StartsWith("```")) json = json.Split('\n', 3)[1];
                if (json.EndsWith("```")) json = json[..^3].Trim();

                var parsed = JsonSerializer.Deserialize<AiSanitizeResponse>(json,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (parsed is not null)
                {
                    return new SanitizeResult(
                        parsed.Sanitized,
                        parsed.PiiDetected,
                        parsed.Blocked,
                        parsed.Reason ?? string.Empty
                    );
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AI sanitizer call failed — falling back to regex result.");
            }
        }

        // Fallback: return regex result
        return new SanitizeResult(
            SanitizedContent: regexCleaned,
            PiiDetected: piiFound,
            Blocked: false,
            Reason: piiFound ? "PII detected and redacted by regex filter" : string.Empty
        );
    }

    private record AiSanitizeResponse(
        string Sanitized,
        bool PiiDetected,
        bool Blocked,
        string? Reason
    );
}