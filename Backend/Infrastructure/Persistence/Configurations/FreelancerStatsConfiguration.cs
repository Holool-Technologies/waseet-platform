using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Waseet.Domain.Entities;
using SkillLevel = Domain.Enums.SkillLevel;

namespace Waseet.Infrastructure.Persistence.Configurations;

public class FreelancerStatsConfiguration
    : IEntityTypeConfiguration<FreelancerStats>
{
    public void Configure(EntityTypeBuilder<FreelancerStats> builder)
    {
        builder.HasKey(s => s.UserId);

        builder.Property(s => s.SuccessRate)
            .HasColumnType("DECIMAL(5,2)");

        builder.Property(s => s.AvgDeliveryDays)
            .HasColumnType("DECIMAL(5,1)");

        builder.Property(s => s.TotalEarningsUSD)
            .HasColumnType("DECIMAL(18,2)");

        builder.Property(s => s.SkillLevel)
            .HasDefaultValue(SkillLevel.Newcomer);

        builder.Property(s => s.ComputedAt)
            .HasDefaultValueSql("GETUTCDATE()");

        builder.HasOne(s => s.User)
            .WithOne()
            .HasForeignKey<FreelancerStats>(s => s.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}