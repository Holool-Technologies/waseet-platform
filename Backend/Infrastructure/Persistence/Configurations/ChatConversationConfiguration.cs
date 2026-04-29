using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;


namespace Waseet.Infrastructure.Persistence.Configurations;

public class ChatConversationConfiguration : IEntityTypeConfiguration<ChatConversation>
{
    public void Configure(EntityTypeBuilder<ChatConversation> builder)
    {
        builder.HasKey(c => c.ConversationId);

        builder.HasIndex(c => new { c.TaskId, c.ClientUserId, c.FreelancerUserId })
            .IsUnique();

        builder.Property(c => c.LastMessage).HasMaxLength(500);
        builder.Property(c => c.LastMessageAt).HasDefaultValueSql("GETUTCDATE()");
        builder.Property(c => c.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

        builder.HasOne(c => c.Task)
            .WithMany()
            .HasForeignKey(c => c.TaskId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}