namespace Domain.Entities;

public class ChatConversation
{
    public Guid ConversationId { get; set; }    // deterministic — not auto-generated
    public Guid TaskId { get; set; }
    public Guid ClientUserId { get; set; }
    public Guid FreelancerUserId { get; set; }
    public string LastMessage { get; set; } = string.Empty;
    public DateTime LastMessageAt { get; set; } = DateTime.UtcNow;
    public int ClientUnreadCount { get; set; } = 0;
    public int FreelancerUnreadCount { get; set; } = 0;
    public bool HasMessages { get; set; } = false;  // NEW — lazy creation flag
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Task Task { get; set; } = null!;
}