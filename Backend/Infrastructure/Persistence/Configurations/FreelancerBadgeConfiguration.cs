using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Waseet.Domain.Entities;


namespace Waseet.Infrastructure.Persistence.Configurations;

public class FreelancerBadgeConfiguration
    : IEntityTypeConfiguration<FreelancerBadge>
{
    public void Configure(EntityTypeBuilder<FreelancerBadge> builder)
    {
        builder.HasKey(b => b.BadgeId);

        builder.HasIndex(b => new { b.UserId, b.Type }).IsUnique();

        builder.Property(b => b.EarnedAt)
            .HasDefaultValueSql("GETUTCDATE()");

        builder.HasOne(b => b.User)
            .WithMany()
            .HasForeignKey(b => b.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}