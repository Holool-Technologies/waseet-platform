using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ConversationScoping_KycDoc_DateFix : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ConversationId",
                table: "ChatMessages",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<bool>(
                name: "HasMessages",
                table: "ChatConversations",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_ChatMessages_ConversationId_SentAt",
                table: "ChatMessages",
                columns: new[] { "ConversationId", "SentAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ChatMessages_ConversationId_SentAt",
                table: "ChatMessages");

            migrationBuilder.DropColumn(
                name: "ConversationId",
                table: "ChatMessages");

            migrationBuilder.DropColumn(
                name: "HasMessages",
                table: "ChatConversations");
        }
    }
}
