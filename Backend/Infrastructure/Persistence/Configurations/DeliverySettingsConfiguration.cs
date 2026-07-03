using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using System.Reflection.Emit;

namespace Infrastructure.Persistence.Configurations;

public class DeliverySettingsConfiguration : IEntityTypeConfiguration<DeliverySettings>
{
    public void Configure(EntityTypeBuilder<DeliverySettings> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.ReviewWindowDays).HasDefaultValue(7);
        builder.Property(s => s.MaxRevisions).HasDefaultValue(3);
        builder.HasData(
          new DeliverySettings
          {
              Id = 1,
              MaxRevisions = 3,
              ReviewWindowDays = 7,
              UpdatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) // تاريخ ثابت
          }
      );
    }
}