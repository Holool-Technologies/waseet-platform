using Application.Features.Auth.DTOs;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Application.Features.Auth.Interfaces;
using Infrastructure.Persistence;
using Task=System.Threading.Tasks.Task;
using Domain.Interfaces;
using Microsoft.Extensions.Configuration;

namespace Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly WaseetDbContext _db;
    private readonly JwtSettings _jwt;
    private readonly IEmailService _email;
    private readonly IConfiguration _config;

    public AuthService(
    WaseetDbContext db, 
    IOptions<JwtSettings> jwt,
    IEmailService email,
    IConfiguration config)
    {
        _db = db;
        _jwt = jwt.Value;
        _email = email;
        _config = config;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        var exists = await _db.Users.AnyAsync(u => u.Email == request.Email, ct);
        if (exists)
            throw new InvalidOperationException("Email already registered.");

        var user = new User
        {
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = (UserRole)request.Role
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);

        return await GenerateTokensAsync(user, ct);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
{
    var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == request.Email, ct);
    if (user is null)
        throw new UnauthorizedAccessException("Email not found.");

    if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        throw new UnauthorizedAccessException("Incorrect password.");

    return await GenerateTokensAsync(user, ct);
}

    public async Task<AuthResponse> RefreshAsync(string refreshToken, CancellationToken ct = default)
    {
        var token = await _db.RefreshTokens
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Token == refreshToken, ct)
            ?? throw new UnauthorizedAccessException("Invalid refresh token.");

        if (token.IsRevoked || token.ExpiresAt < DateTime.UtcNow)
            throw new UnauthorizedAccessException("Refresh token expired or revoked.");

        token.IsRevoked = true;
        await _db.SaveChangesAsync(ct);

        return await GenerateTokensAsync(token.User, ct);
    }

    public async Task RevokeAsync(string refreshToken, CancellationToken ct = default)
    {
        var token = await _db.RefreshTokens
            .FirstOrDefaultAsync(r => r.Token == refreshToken, ct);

        if (token is null) return;

        token.IsRevoked = true;
        await _db.SaveChangesAsync(ct);
    }

    private async Task<AuthResponse> GenerateTokensAsync(User user, CancellationToken ct)
    {
        var accessToken = GenerateJwt(user);
        var refreshToken = await CreateRefreshTokenAsync(user.UserId, ct);
        var expiresAt = DateTime.UtcNow.AddMinutes(_jwt.ExpiryMinutes);

        return new AuthResponse(
            AccessToken: accessToken,
            RefreshToken: refreshToken,
            ExpiresAt: expiresAt,
            UserId: user.UserId,
            Role: (int)user.Role
        );
    }

    private string GenerateJwt(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.SecretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.UserId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("role", user.Role.ToString()),
            new Claim("kycStatus", user.KycStatus.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: _jwt.Issuer,
            audience: _jwt.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_jwt.ExpiryMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private async Task<string> CreateRefreshTokenAsync(Guid userId, CancellationToken ct)
    {
        var tokenValue = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

        var refreshToken = new RefreshToken
        {
            UserId = userId,
            Token = tokenValue,
            ExpiresAt = DateTime.UtcNow.AddDays(_jwt.RefreshTokenExpiryDays)
        };

        _db.RefreshTokens.Add(refreshToken);
        await _db.SaveChangesAsync(ct);

        return tokenValue;
    }

    public async Task ForgotPasswordAsync(string email, CancellationToken ct = default)
{
    // Always return success — never reveal if email exists (security)
    var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);
    if (user is null) return;

    // Invalidate previous tokens
    var old = await _db.PasswordResetTokens
        .Where(t => t.UserId == user.UserId && !t.IsUsed && t.ExpiresAt > DateTime.UtcNow)
        .ToListAsync(ct);
    old.ForEach(t => t.IsUsed = true);

    var tokenValue = Convert.ToBase64String(
        System.Security.Cryptography.RandomNumberGenerator.GetBytes(48))
        .Replace("+", "-").Replace("/", "_").Replace("=", "");

    _db.PasswordResetTokens.Add(new PasswordResetToken
    {
        UserId = user.UserId,
        Token = tokenValue,
        ExpiresAt = DateTime.UtcNow.AddHours(1)
    });

    await _db.SaveChangesAsync(ct);

    var frontendUrl = _config["AllowedOrigins:0"] ?? "http://localhost:4200";
    var resetLink = $"{frontendUrl}/auth/reset-password?token={tokenValue}";
    await _email.SendPasswordResetAsync(user.Email, resetLink, ct);
}

public async Task ResetPasswordAsync(string token, string newPassword, CancellationToken ct = default)
{
    var record = await _db.PasswordResetTokens
        .Include(t => t.User)
        .FirstOrDefaultAsync(t => t.Token == token, ct);

    if (record is null || record.IsUsed || record.ExpiresAt < DateTime.UtcNow)
        throw new InvalidOperationException("Reset token is invalid or expired.");

    record.User.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
    record.IsUsed = true;
    await _db.SaveChangesAsync(ct);
}

public async Task<AuthResponse> GoogleLoginAsync(string idToken, CancellationToken ct = default)
{
    // Validate Google ID token
    var payload = await Google.Apis.Auth.GoogleJsonWebSignature.ValidateAsync(idToken,
        new Google.Apis.Auth.GoogleJsonWebSignature.ValidationSettings
        {
            Audience = new[] { _config["Google:ClientId"] }
        });

    var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == payload.Email, ct);

    if (user is null)
    {
        // Auto-register via Google
        user = new User
        {
            Email = payload.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString()),
            GoogleId = payload.Subject,
            Role = Domain.Enums.UserRole.Freelancer // default, can be changed
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);
        await _email.SendWelcomeAsync(user.Email, ct);
    }
    else if (user.GoogleId is null)
    {
        // Link existing account
        user.GoogleId = payload.Subject;
        await _db.SaveChangesAsync(ct);
    }

    return await GenerateTokensAsync(user, ct);
}
}