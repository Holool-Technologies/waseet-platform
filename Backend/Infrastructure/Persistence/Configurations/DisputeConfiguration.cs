using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Waseet.Domain.Entities;

namespace Waseet.Infrastructure.Persistence.Configurations;

public class DisputeConfiguration : IEntityTypeConfiguration<Dispute>
{
    public void Configure(EntityTypeBuilder<Dispute> builder)
    {
        builder.HasKey(d => d.DisputeId);
        builder.Property(d => d.Report).IsRequired().HasMaxLength(3000);
        builder.Property(d => d.AdminNotes).HasMaxLength(2000);
        builder.Property(d => d.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

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