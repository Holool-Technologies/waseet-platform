using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Domain.Entities;
using Domain.Enums;

namespace Waseet.Infrastructure.Persistence.Configurations;

public class ProposalConfiguration : IEntityTypeConfiguration<Proposal>
{
    public void Configure(EntityTypeBuilder<Proposal> builder)
    {
        builder.HasKey(p => p.ProposalId);

        builder.Property(p => p.FreelancerUserId)
            .IsRequired();

        builder.Property(p => p.CoverLetter)
            .IsRequired()
            .HasColumnType("NVARCHAR(MAX)");

        builder.Property(p => p.BidAmount)
            .IsRequired()
            .HasColumnType("DECIMAL(18,2)");

        builder.Property(p => p.Status)
            .IsRequired()
            .HasDefaultValue(ProposalStatus.Pending);

        builder.Property(p => p.SubmittedAt)
            .IsRequired()
            .HasDefaultValueSql("GETUTCDATE()");

        // One freelancer cannot submit two proposals for the same task
        builder.HasIndex(p => new { p.TaskId, p.FreelancerUserId })
            .IsUnique();
    }
}