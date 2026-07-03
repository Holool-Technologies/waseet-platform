using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Task=Domain.Entities.Task;

namespace Infrastructure.Persistence;

public class WaseetDbContext : DbContext
{
    public WaseetDbContext(DbContextOptions<WaseetDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Task> Tasks => Set<Task>();
    public DbSet<Proposal> Proposals => Set<Proposal>();
    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();
    public DbSet<EscrowTransaction> EscrowTransactions => Set<EscrowTransaction>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
    public DbSet<FreelancerProfile> FreelancerProfiles => Set<FreelancerProfile>();
    public DbSet<PortfolioItem> PortfolioItems => Set<PortfolioItem>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<ChatConversation> ChatConversations => Set<ChatConversation>();
    public DbSet<Delivery> Deliveries => Set<Delivery>();
    public DbSet<DeliveryFile> DeliveryFiles => Set<DeliveryFile>();
    public DbSet<RevisionRequest> RevisionRequests => Set<RevisionRequest>();
    public DbSet<Dispute> Disputes => Set<Dispute>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<DeliverySettings> DeliverySettings => Set<DeliverySettings>();
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(WaseetDbContext).Assembly);
    }
}
