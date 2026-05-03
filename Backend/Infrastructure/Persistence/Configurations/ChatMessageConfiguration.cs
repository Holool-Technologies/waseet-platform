using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Domain.Entities;

namespace Infrastructure.Persistence.Configurations;

public class ChatMessageConfiguration : IEntityTypeConfiguration<ChatMessage>
{
    public void Configure(EntityTypeBuilder<ChatMessage> builder)
    {
        builder.HasKey(m => m.MessageId);
        builder.Property(m => m.ConversationId).IsRequired();
        builder.Property(m => m.SenderUserId).IsRequired();
        builder.Property(m => m.OriginalEncrypted).HasColumnType("VARBINARY(MAX)");
        builder.Property(m => m.SanitizedContent).HasColumnType("NVARCHAR(MAX)");
        builder.Property(m => m.AiFlags).HasMaxLength(500).HasDefaultValue("{}");
        builder.Property(m => m.SentAt).HasDefaultValueSql("GETUTCDATE()");

        // Index for scoped conversation queries
        builder.HasIndex(m => new { m.ConversationId, m.SentAt });
        builder.HasIndex(m => new { m.TaskId, m.SentAt });
    }
}