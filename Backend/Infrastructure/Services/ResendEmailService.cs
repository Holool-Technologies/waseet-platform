using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Domain.Interfaces;

namespace Infrastructure.Services;

public class ResendEmailService : IEmailService
{
    private readonly HttpClient _http;
    private readonly string _apiKey;
    private readonly string _fromEmail;
    private readonly ILogger<ResendEmailService> _logger;

    public ResendEmailService(
        IHttpClientFactory httpClientFactory,
        IConfiguration config,
        ILogger<ResendEmailService> logger)
    {
        _http = httpClientFactory.CreateClient("Resend");
        _apiKey = config["Resend:ApiKey"] ?? throw new InvalidOperationException("Resend:ApiKey missing.");
        _fromEmail = config["Resend:FromEmail"] ?? "noreply@waseet.app";
        _logger = logger;
    }

    public async Task SendPasswordResetAsync(string toEmail, string resetLink, CancellationToken ct = default)
    {
        var html = $"""
            <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;">
              <h2 style="color:#4f6ef7;">وسيط — Waseet</h2>
              <p>You requested a password reset. Click the button below:</p>
              <a href="{resetLink}"
                 style="display:inline-block;background:#4f6ef7;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">
                Reset Password
              </a>
              <p style="color:#888;font-size:13px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
            </div>
            """;

        await SendAsync(toEmail, "Reset your Waseet password", html, ct);
    }

    public async Task SendWelcomeAsync(string toEmail, CancellationToken ct = default)
    {
        var html = $"""
            <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;">
              <h2 style="color:#4f6ef7;">Welcome to وسيط — Waseet</h2>
              <p>Your account has been created. Complete your KYC to start posting or bidding on tasks.</p>
            </div>
            """;

        await SendAsync(toEmail, "Welcome to Waseet", html, ct);
    }

    private async Task SendAsync(string to, string subject, string html, CancellationToken ct)
    {
        var payload = JsonSerializer.Serialize(new
        {
            from = _fromEmail,
            to = new[] { to },
            subject,
            html
        });

        var request = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails")
        {
            Content = new StringContent(payload, Encoding.UTF8, "application/json")
        };
        request.Headers.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _apiKey);

        var response = await _http.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            _logger.LogError("Resend failed: {StatusCode} {Body}", response.StatusCode, body);
        }
    }
}