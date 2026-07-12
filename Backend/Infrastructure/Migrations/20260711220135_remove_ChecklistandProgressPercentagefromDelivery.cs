using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class remove_ChecklistandProgressPercentagefromDelivery : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Checklist",
                table: "Deliveries");

            migrationBuilder.DropColumn(
                name: "ProgressPercent",
                table: "Deliveries");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Checklist",
                table: "Deliveries",
                type: "NVARCHAR(MAX)",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<int>(
                name: "ProgressPercent",
                table: "Deliveries",
                type: "int",
                nullable: false,
                defaultValue: 100);
        }
    }
}
