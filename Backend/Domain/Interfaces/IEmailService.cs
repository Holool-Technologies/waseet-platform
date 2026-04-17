namespace Domain.Interfaces;

public interface IEmailService
{
    Task SendPasswordResetAsync(string toEmail, string resetLink, CancellationToken ct = default);
    Task SendWelcomeAsync(string toEmail, CancellationToken ct = default);
}