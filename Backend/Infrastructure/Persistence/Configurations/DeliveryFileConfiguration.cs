using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Waseet.Domain.Entities;

namespace Waseet.Infrastructure.Persistence.Configurations;

public class DeliveryFileConfiguration : IEntityTypeConfiguration<DeliveryFile>
{
    public void Configure(EntityTypeBuilder<DeliveryFile> builder)
    {
        builder.HasKey(f => f.FileId);
        builder.Property(f => f.FileName).IsRequired().HasMaxLength(255);
        builder.Property(f => f.BlobRef).IsRequired().HasMaxLength(500);
        builder.Property(f => f.ContentType).HasMaxLength(150);
        builder.Property(f => f.UploadedAt).HasDefaultValueSql("GETUTCDATE()");
    }
}