using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Waseet.Domain.Entities;

namespace Waseet.Infrastructure.Persistence.Configurations;

public class DeliveryConfiguration : IEntityTypeConfiguration<Delivery>
{
    public void Configure(EntityTypeBuilder<Delivery> builder)
    {
        builder.HasKey(d => d.DeliveryId);
        builder.Property(d => d.Note).HasMaxLength(2000);
        builder.Property(d => d.SubmittedAt).HasDefaultValueSql("GETUTCDATE()");

        builder.HasIndex(d => new { d.TaskId, d.Status });
        builder.HasIndex(d => d.ReviewDeadline);   // for the background job query

        builder.HasOne(d => d.Task)
            .WithMany()
            .HasForeignKey(d => d.TaskId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(d => d.Files)
            .WithOne(f => f.Delivery)
            .HasForeignKey(f => f.DeliveryId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}