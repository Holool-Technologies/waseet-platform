using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Phase_SkillLevelsBadgesStats : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ClientStats",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TasksPosted = table.Column<int>(type: "int", nullable: false),
                    TasksCompleted = table.Column<int>(type: "int", nullable: false),
                    TotalPaidUSD = table.Column<int>(type: "int", nullable: false),
                    DisputesOpened = table.Column<int>(type: "int", nullable: false),
                    DisputesWon = table.Column<int>(type: "int", nullable: false),
                    AvgPaymentDays = table.Column<decimal>(type: "DECIMAL(5,1)", nullable: false),
                    ComputedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClientStats", x => x.UserId);
                    table.ForeignKey(
                        name: "FK_ClientStats_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FreelancerBadges",
                columns: table => new
                {
                    BadgeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Type = table.Column<int>(type: "int", nullable: false),
                    EarnedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FreelancerBadges", x => x.BadgeId);
                    table.ForeignKey(
                        name: "FK_FreelancerBadges_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FreelancerStats",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SkillLevel = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    TasksCompleted = table.Column<int>(type: "int", nullable: false),
                    TasksAwarded = table.Column<int>(type: "int", nullable: false),
                    TotalDisputes = table.Column<int>(type: "int", nullable: false),
                    DisputesLost = table.Column<int>(type: "int", nullable: false),
                    RevisionsRequested = table.Column<int>(type: "int", nullable: false),
                    OnTimeDeliveries = table.Column<int>(type: "int", nullable: false),
                    EarlyDeliveries = table.Column<int>(type: "int", nullable: false),
                    SuccessRate = table.Column<decimal>(type: "DECIMAL(5,2)", nullable: false),
                    AvgDeliveryDays = table.Column<decimal>(type: "DECIMAL(5,1)", nullable: false),
                    TotalEarningsUSD = table.Column<decimal>(type: "DECIMAL(18,2)", nullable: false),
                    SkillsCount = table.Column<int>(type: "int", nullable: false),
                    UniqueClientsCount = table.Column<int>(type: "int", nullable: false),
                    RepeatClientsCount = table.Column<int>(type: "int", nullable: false),
                    ConsecutiveOnTime = table.Column<int>(type: "int", nullable: false),
                    JoinedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastActiveAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ComputedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FreelancerStats", x => x.UserId);
                    table.ForeignKey(
                        name: "FK_FreelancerStats_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FreelancerBadges_UserId_Type",
                table: "FreelancerBadges",
                columns: new[] { "UserId", "Type" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ClientStats");

            migrationBuilder.DropTable(
                name: "FreelancerBadges");

            migrationBuilder.DropTable(
                name: "FreelancerStats");
        }
    }
}
