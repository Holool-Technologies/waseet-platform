using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Domain.Entities;

namespace Infrastructure.Persistence.Configurations;

public class ChatConversationConfiguration : IEntityTypeConfiguration<ChatConversation>
{
    public void Configure(EntityTypeBuilder<ChatConversation> builder)
    {
        builder.HasKey(c => c.ConversationId);

        // Deterministic — no auto-generated value
        builder.Property(c => c.ConversationId)
            .ValueGeneratedNever();

        builder.HasIndex(c => new { c.TaskId, c.ClientUserId, c.FreelancerUserId })
            .IsUnique();

        builder.Property(c => c.LastMessage).HasMaxLength(500);
        builder.Property(c => c.LastMessageAt).HasDefaultValueSql("GETUTCDATE()");
        builder.Property(c => c.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
        builder.Property(c => c.HasMessages).HasDefaultValue(false);

        builder.HasOne(c => c.Task)
            .WithMany()
            .HasForeignKey(c => c.TaskId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}