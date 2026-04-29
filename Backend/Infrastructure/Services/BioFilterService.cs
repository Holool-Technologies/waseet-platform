using Azure;
using Domain.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using OpenAI;
using OpenAI.Chat;
using System.Text.Json;

namespace Infrastructure.Services;

public record BioFilterResult(string FilteredBio, bool WasModified);

public class BioFilterService
{
    private readonly ChatClient? _chatClient;
    private readonly string _deployment;
    private readonly ILogger<BioFilterService> _logger;
    private readonly bool _enabled;

    private const string BioSystemPrompt = """
        You are a professional bio editor for a double-blind freelance platform.
        Rewrite the provided bio to:
        1. Be professional and formal in tone
        2. Use neutral, impersonal language (no "I", "my", "me", "we", personal names)
        3. Focus only on skills, experience, and professional capabilities
        4. Remove any contact information, social media handles, or personal identifiers
        5. Keep it concise (max 300 words)
        6. Preserve technical skills and domain expertise

        Return ONLY the rewritten bio text — no explanation, no quotes, no markdown.
        If the input is already appropriate, return it as-is.
        """;

    public BioFilterService(IConfiguration config, ILogger<BioFilterService> logger)
    {
        _logger = logger;
        _deployment = config["AzureOpenAI:DeploymentName"] ?? "gpt-4o-mini";

        var endpoint = config["AzureOpenAI:Endpoint"];
        var apiKey = config["AzureOpenAI:ApiKey"];

        if (!string.IsNullOrWhiteSpace(endpoint) && !string.IsNullOrWhiteSpace(apiKey))
        {
            _chatClient = new ChatClient("gpt-4o-mini", new System.ClientModel.ApiKeyCredential(apiKey));
            _enabled = true;
        }
    }

    public async Task<BioFilterResult> FilterAsync(string rawBio, CancellationToken ct = default)
    {
        if (!_enabled || _chatClient is null || string.IsNullOrWhiteSpace(rawBio))
            return new BioFilterResult(rawBio, false);

        try
        {
            var messages = new List<ChatMessage>
                {
                    ChatMessage.CreateSystemMessage(BioSystemPrompt),
                    ChatMessage.CreateUserMessage(rawBio)
                };

            var chatCompletion = await _chatClient.CompleteChatAsync(
                messages,
                new ChatCompletionOptions
                {
                    Temperature = 0,
                    MaxOutputTokenCount = 400
                },
                cancellationToken: ct
            );

            var json = chatCompletion.Value.Content[0].Text.Trim();

            // Strip markdown fences if model wraps in ```json
            if (json.StartsWith("```")) json = json.Split('\n', 3)[1];
            if (json.EndsWith("```")) json = json[..^3].Trim();

            var parsed = JsonSerializer.Deserialize<BioFilterResult>(json,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (parsed is not null)
            {
                return new BioFilterResult(
                    parsed.FilteredBio,
                    parsed.WasModified
                );
            }
                _logger.LogWarning("Bio filter returned invalid JSON, saving original. Response: {Response}", json);
                return new BioFilterResult(rawBio, false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Bio filter failed — saving original.");
            return new BioFilterResult(rawBio, false);
        }
    }
}