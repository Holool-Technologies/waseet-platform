using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;


namespace Waseet.Infrastructure.Persistence.Configurations;

public class FreelancerProfileConfiguration : IEntityTypeConfiguration<FreelancerProfile>
{
    public void Configure(EntityTypeBuilder<FreelancerProfile> builder)
    {
        builder.HasKey(p => p.ProfileId);

        builder.HasIndex(p => p.UserId).IsUnique();

        builder.Property(p => p.Bio)
            .HasColumnType("NVARCHAR(MAX)");

        builder.Property(p => p.BioOriginal)
            .HasColumnType("NVARCHAR(MAX)");

        builder.Property(p => p.Title)
            .HasMaxLength(200);

        builder.Property(p => p.Skills)
            .HasColumnType("NVARCHAR(MAX)")
            .HasDefaultValue("[]");

        builder.Property(p => p.Balance)
            .HasColumnType("DECIMAL(18,2)")
            .HasDefaultValue(0);

        builder.Property(p => p.CreatedAt)
            .HasDefaultValueSql("GETUTCDATE()");

        builder.Property(p => p.UpdatedAt)
            .HasDefaultValueSql("GETUTCDATE()");

        builder.HasOne(p => p.User)
            .WithOne()
            .HasForeignKey<FreelancerProfile>(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(p => p.PortfolioItems)
            .WithOne(i => i.Profile)
            .HasForeignKey(i => i.ProfileId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}