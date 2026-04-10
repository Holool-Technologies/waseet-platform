using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Domain.Entities;

namespace Waseet.Infrastructure.Persistence.Configurations;

public class ChatMessageConfiguration : IEntityTypeConfiguration<ChatMessage>
{
    public void Configure(EntityTypeBuilder<ChatMessage> builder)
    {
        builder.HasKey(m => m.MessageId);

        builder.Property(m => m.SenderUserId)
            .IsRequired();

        builder.Property(m => m.OriginalEncrypted)
            .IsRequired()
            .HasColumnType("VARBINARY(MAX)");

        builder.Property(m => m.SanitizedContent)
            .IsRequired()
            .HasColumnType("NVARCHAR(MAX)");

        builder.Property(m => m.AiFlags)
            .IsRequired()
            .HasMaxLength(500)
            .HasDefaultValue("{}");

        builder.Property(m => m.SentAt)
            .IsRequired()
            .HasDefaultValueSql("GETUTCDATE()");

        // Index for fast message history retrieval per task
        builder.HasIndex(m => new { m.TaskId, m.SentAt });
    }
}