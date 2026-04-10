using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Domain.Enums;

namespace Waseet.Infrastructure.Persistence.Configurations;

public class KycRecordConfiguration : IEntityTypeConfiguration<KycRecord>
{
    public void Configure(EntityTypeBuilder<KycRecord> builder)
    {
        builder.HasKey(k => k.KycId);

        builder.Property(k => k.FullNameEncrypted)
            .IsRequired()
            .HasColumnType("VARBINARY(512)");

        builder.Property(k => k.DocumentBlobRef)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(k => k.Status)
            .IsRequired()
            .HasDefaultValue(KycStatus.Pending);

        builder.Property(k => k.SubmittedAt)
            .IsRequired()
            .HasDefaultValueSql("GETUTCDATE()");

        builder.Property(k => k.VerifiedAt)
            .IsRequired(false);
    }
}