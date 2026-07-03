using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.HasKey(a => a.LogId);
        builder.Property(a => a.EntityType).IsRequired().HasMaxLength(50);
        builder.Property(a => a.EventType).IsRequired().HasMaxLength(100);
        builder.Property(a => a.ActorType).HasMaxLength(20);
        builder.Property(a => a.Payload).HasColumnType("NVARCHAR(MAX)");
        builder.Property(a => a.OccurredAt).HasDefaultValueSql("GETUTCDATE()");

        builder.HasIndex(a => new { a.EntityType, a.EntityId });
        builder.HasIndex(a => a.OccurredAt);
    }
}