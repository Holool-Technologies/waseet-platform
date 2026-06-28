using Microsoft.EntityFrameworkCore;
using Domain.Entities;
using Domain.Enums;
using Task=System.Threading.Tasks.Task;
namespace Infrastructure.Persistence;

public static class WaseetDbSeeder
{
    public static async Task SeedAsync(WaseetDbContext db)
    {
        await db.Database.MigrateAsync();

        if (!await db.Users.AnyAsync(u => u.Role == UserRole.Admin))
        {
            db.Users.Add(new User
            {
                Email = "admin@waseet.app",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@Waseet2025!"),
                Role = UserRole.Admin,
                CreatedAt = DateTime.UtcNow
            });

            await db.SaveChangesAsync();
        }
    }
}