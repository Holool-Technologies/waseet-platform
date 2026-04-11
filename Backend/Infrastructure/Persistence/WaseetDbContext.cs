using Domain.Entities;
using Task=Domain.Entities.Task;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using System.Reflection.Emit;
using Domain.Enums;

namespace Infrastructure.Persistence;

public class WaseetDbContext : DbContext
{
    public WaseetDbContext(DbContextOptions<WaseetDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<KycRecord> KycRecords => Set<KycRecord>();
    public DbSet<Task> Tasks => Set<Task>();
    public DbSet<Proposal> Proposals => Set<Proposal>();
    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();
    public DbSet<EscrowTransaction> EscrowTransactions => Set<EscrowTransaction>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(WaseetDbContext).Assembly);
    }
}
