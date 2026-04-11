using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TaskStatus = Domain.Enums.TaskStatus;

namespace Waseet.Infrastructure.Persistence.Configurations;

public class TaskConfiguration : IEntityTypeConfiguration<global::Domain.Entities.Task>
{
    public void Configure(EntityTypeBuilder<global::Domain.Entities.Task> builder)
    {
        builder.HasKey(t => t.TaskId);

        builder.Property(t => t.PublicTaskCode)
            .IsRequired()
            .HasMaxLength(10)
            .HasColumnType("CHAR(10)");

        builder.HasIndex(t => t.PublicTaskCode)
            .IsUnique();

        builder.Property(t => t.Title)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(t => t.Description)
            .IsRequired()
            .HasColumnType("NVARCHAR(MAX)");

        builder.Property(t => t.BudgetUSD)
            .IsRequired()
            .HasColumnType("DECIMAL(18,2)");

        builder.Property(t => t.Status)
            .IsRequired()
            .HasDefaultValue(TaskStatus.Open);

        builder.Property(t => t.ClientUserId)
            .IsRequired();

        builder.Property(t => t.FreelancerUserId)
            .IsRequired(false);

        builder.Property(t => t.CreatedAt)
            .IsRequired()
            .HasDefaultValueSql("GETUTCDATE()");

        builder.Property(t => t.UpdatedAt)
            .IsRequired()
            .HasDefaultValueSql("GETUTCDATE()");

        // No FK to Users table — intentional double-blind isolation
        builder.HasMany(t => t.Proposals)
            .WithOne(p => p.Task)
            .HasForeignKey(p => p.TaskId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(t => t.Messages)
            .WithOne(m => m.Task)
            .HasForeignKey(m => m.TaskId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(t => t.Escrow)
            .WithOne(e => e.Task)
            .HasForeignKey<EscrowTransaction>(e => e.TaskId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}