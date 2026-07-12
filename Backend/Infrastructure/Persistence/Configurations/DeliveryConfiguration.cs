using Domain.Entities;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

public class DeliveryConfiguration : IEntityTypeConfiguration<Delivery>
{
    public void Configure(EntityTypeBuilder<Delivery> builder)
    {
        builder.HasKey(d => d.DeliveryId);
        builder.Property(d => d.Note).HasMaxLength(3000);
        builder.Property(d => d.RevisionNumber).HasDefaultValue(0);
        builder.Property(d => d.Status).HasDefaultValue(DeliveryStatus.AwaitingReview);
        builder.Property(d => d.SubmittedAt).HasDefaultValueSql("GETUTCDATE()");

        builder.HasIndex(d => new { d.TaskId, d.Status });
        builder.HasIndex(d => d.ReviewDeadline);

        builder.HasOne(d => d.Task)
            .WithMany()
            .HasForeignKey(d => d.TaskId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(d => d.Files)
            .WithOne(f => f.Delivery)
            .HasForeignKey(f => f.DeliveryId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(d => d.RevisionRequests)
            .WithOne(r => r.Delivery)
            .HasForeignKey(r => r.DeliveryId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.Property(d => d.VideoUrl).HasMaxLength(500);
        builder.Property(d => d.Links).HasColumnType("NVARCHAR(MAX)").HasDefaultValue("[]");
    }
}