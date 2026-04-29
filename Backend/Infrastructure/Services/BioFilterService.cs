using Azure;
using Azure.AI.OpenAI;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using OpenAI;
using OpenAI.Chat;

namespace Infrastructure.Services;

public record BioFilterResult(string FilteredBio, bool WasModified);

public class BioFilterService
{
    private readonly OpenAIClient? _client;
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
            _client = new OpenAIClient(new Uri(endpoint), new AzureKeyCredential(apiKey));
            _enabled = true;
        }
    }

    public async Task<BioFilterResult> FilterAsync(string rawBio, CancellationToken ct = default)
    {
        if (!_enabled || _client is null || string.IsNullOrWhiteSpace(rawBio))
            return new BioFilterResult(rawBio, false);

        try
        {
            var options = new ChatCompletionsOptions
            {
                DeploymentName = _deployment,
                MaxTokens = 400,
                Temperature = 0.3f,
                Messages =
                {
                    new ChatRequestSystemMessage(BioSystemPrompt),
                    new ChatRequestUserMessage(rawBio)
                }
            };

            var response = await _client.GetChatCompletionsAsync(options, ct);
            var filtered = response.Value.Choices[0].Message.Content.Trim();
            bool wasModified = !string.Equals(filtered, rawBio,
                StringComparison.OrdinalIgnoreCase);

            return new BioFilterResult(filtered, wasModified);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Bio filter failed — saving original.");
            return new BioFilterResult(rawBio, false);
        }
    }
}