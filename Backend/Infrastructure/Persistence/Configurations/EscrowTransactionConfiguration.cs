using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Domain.Entities;
using Domain.Enums;

namespace Waseet.Infrastructure.Persistence.Configurations;

public class EscrowTransactionConfiguration : IEntityTypeConfiguration<EscrowTransaction>
{
    public void Configure(EntityTypeBuilder<EscrowTransaction> builder)
    {
        builder.HasKey(e => e.EscrowId);

        builder.Property(e => e.AmountUSD)
            .IsRequired()
            .HasColumnType("DECIMAL(18,2)");

        builder.Property(e => e.Status)
            .IsRequired()
            .HasDefaultValue(EscrowStatus.Held);

        builder.Property(e => e.HeldAt)
            .IsRequired()
            .HasDefaultValueSql("GETUTCDATE()");

        builder.Property(e => e.ReleasedAt)
            .IsRequired(false);

        builder.Property(e => e.ReleasedToUserId)
            .IsRequired(false);

        builder.Property(e => e.ProviderReference)
            .HasMaxLength(100);
    }
}