using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Delivery_WorkspaceFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Checklist",
                table: "Deliveries",
                type: "NVARCHAR(MAX)",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<string>(
                name: "Links",
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

            migrationBuilder.AddColumn<string>(
                name: "VideoUrl",
                table: "Deliveries",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Checklist",
                table: "Deliveries");

            migrationBuilder.DropColumn(
                name: "Links",
                table: "Deliveries");

            migrationBuilder.DropColumn(
                name: "ProgressPercent",
                table: "Deliveries");

            migrationBuilder.DropColumn(
                name: "VideoUrl",
                table: "Deliveries");
        }
    }
}
