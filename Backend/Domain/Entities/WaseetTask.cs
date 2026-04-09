using Domain.Enums;
using TaskStatus = Domain.Enums.TaskStatus;
namespace Domain.Entities;

public class WaseetTask
{
    public Guid TaskId { get; set; } = Guid.NewGuid();
    public string PublicTaskCode { get; set; } = string.Empty; // e.g. WST-A7X2K
    public Guid ClientUserId { get; set; }
    public Guid? FreelancerUserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal BudgetUSD { get; set; }
    public TaskStatus Status { get; set; } = TaskStatus.Open;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Proposal> Proposals { get; set; } = [];
    public ICollection<ChatMessage> Messages { get; set; } = [];
    public EscrowTransaction? Escrow { get; set; }
}