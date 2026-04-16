using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services;

public class TaskCodeGenerator
{
    private readonly WaseetDbContext _db;
    private static readonly char[] Chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".ToCharArray();

    public TaskCodeGenerator(WaseetDbContext db) => _db = db;

    public async Task<string> GenerateAsync(CancellationToken ct = default)
    {
        string code;
        do
        {
            code = "WST-" + GenerateSegment(5);
        }
        while (await _db.Tasks.AnyAsync(t => t.PublicTaskCode == code, ct));

        return code;
    }

    private static string GenerateSegment(int length)
    {
        var rng = System.Security.Cryptography.RandomNumberGenerator.GetBytes(length);
        return new string(rng.Select(b => Chars[b % Chars.Length]).ToArray());
    }
}