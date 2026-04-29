using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PortfolioStatus = Domain.Enums.PortfolioStatus;


namespace Waseet.Infrastructure.Persistence.Configurations;

public class PortfolioItemConfiguration : IEntityTypeConfiguration<PortfolioItem>
{
    public void Configure(EntityTypeBuilder<PortfolioItem> builder)
    {
        builder.HasKey(i => i.ItemId);

        builder.Property(i => i.ImageUrl).IsRequired().HasMaxLength(500);
        builder.Property(i => i.BlobRef).IsRequired().HasMaxLength(500);
        builder.Property(i => i.Caption).HasMaxLength(300);
        builder.Property(i => i.AdminNotes).HasMaxLength(500);

        builder.Property(i => i.Status)
            .HasDefaultValue(PortfolioStatus.Pending);

        builder.Property(i => i.UploadedAt)
            .HasDefaultValueSql("GETUTCDATE()");

        builder.HasIndex(i => new { i.ProfileId, i.Status });
    }
}