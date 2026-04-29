using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;


namespace Waseet.Infrastructure.Persistence.Configurations;

public class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.HasKey(n => n.NotificationId);
        builder.Property(n => n.Type).IsRequired().HasMaxLength(50);
        builder.Property(n => n.TitleEn).IsRequired().HasMaxLength(200);
        builder.Property(n => n.TitleAr).IsRequired().HasMaxLength(200);
        builder.Property(n => n.BodyEn).HasMaxLength(500);
        builder.Property(n => n.BodyAr).HasMaxLength(500);
        builder.Property(n => n.RelatedId).HasMaxLength(100);
        builder.Property(n => n.RelatedUrl).HasMaxLength(300);
        builder.Property(n => n.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

        builder.HasIndex(n => new { n.UserId, n.IsRead, n.CreatedAt });

        builder.HasOne(n => n.User)
            .WithMany()
            .HasForeignKey(n => n.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}