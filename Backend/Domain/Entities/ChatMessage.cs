namespace Domain.Entities;

public class ChatMessage
{
    public Guid MessageId { get; set; } = Guid.NewGuid();
    public Guid TaskId { get; set; }
    public Guid SenderUserId { get; set; }
    public byte[] OriginalEncrypted { get; set; } = [];
    public string SanitizedContent { get; set; } = string.Empty;
    public string AiFlags { get; set; } = "{}"; // JSON: {pii_detected, blocked, reason}
    public DateTime SentAt { get; set; } = DateTime.UtcNow;

    public Task Task { get; set; } = null!;
}