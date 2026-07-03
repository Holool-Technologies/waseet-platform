using Domain.Entities;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

public class DisputeConfiguration : IEntityTypeConfiguration<Dispute>
{
    public void Configure(EntityTypeBuilder<Dispute> builder)
    {
        builder.HasKey(d => d.DisputeId);
        builder.Property(d => d.Report).IsRequired().HasMaxLength(3000);
        builder.Property(d => d.AdminNotes).HasMaxLength(2000);
        builder.Property(d => d.Status).HasDefaultValue(DisputeStatus.Open);
        builder.Property(d => d.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
        builder.Property(d => d.FreelancerAmount).HasColumnType("DECIMAL(18,2)");
        builder.Property(d => d.ClientRefundAmount).HasColumnType("DECIMAL(18,2)");

        // Optimistic concurrency
        builder.Property(d => d.RowVersion)
            .IsRowVersion()
            .IsConcurrencyToken();

        builder.HasIndex(d => d.Status);

        builder.HasOne(d => d.Delivery)
            .WithMany()
            .HasForeignKey(d => d.DeliveryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(d => d.Task)
            .WithMany()
            .HasForeignKey(d => d.TaskId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}