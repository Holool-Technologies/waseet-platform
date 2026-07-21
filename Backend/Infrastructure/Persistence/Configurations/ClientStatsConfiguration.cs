using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Waseet.Domain.Entities;

namespace Waseet.Infrastructure.Persistence.Configurations;

public class ClientStatsConfiguration
    : IEntityTypeConfiguration<ClientStats>
{
    public void Configure(EntityTypeBuilder<ClientStats> builder)
    {
        builder.HasKey(s => s.UserId);
        builder.Property(s => s.AvgPaymentDays)
            .HasColumnType("DECIMAL(5,1)");
        builder.Property(s => s.ComputedAt)
            .HasDefaultValueSql("GETUTCDATE()");
        builder.HasOne(s => s.User)
            .WithOne()
            .HasForeignKey<ClientStats>(s => s.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}