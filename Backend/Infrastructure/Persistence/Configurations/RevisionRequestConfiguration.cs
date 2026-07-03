using Domain.Entities;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

public class RevisionRequestConfiguration : IEntityTypeConfiguration<RevisionRequest>
{
    public void Configure(EntityTypeBuilder<RevisionRequest> builder)
    {
        builder.HasKey(r => r.RevisionId);
        builder.Property(r => r.Reason).IsRequired().HasMaxLength(2000);
        builder.Property(r => r.Status).HasDefaultValue(RevisionStatus.Open);
        builder.Property(r => r.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

        builder.HasIndex(r => new { r.TaskId, r.Status });

        builder.HasOne(r => r.Task)
            .WithMany()
            .HasForeignKey(r => r.TaskId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}