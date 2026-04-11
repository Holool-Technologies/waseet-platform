using Application.Features.Auth.DTOs;
using Application.Features.Auth.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Api.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth")
            .WithTags("Auth")
            .WithOpenApi();

        group.MapPost("/register", async (
            RegisterRequest request,
            IAuthService authService,
            CancellationToken ct) =>
        {
            try
            {
                var result = await authService.RegisterAsync(request, ct);
                return Results.Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return Results.Conflict(new { message = ex.Message });
            }
        });

        group.MapPost("/login", async (
            LoginRequest request,
            IAuthService authService,
            CancellationToken ct) =>
        {
            try
            {
                var result = await authService.LoginAsync(request, ct);
                return Results.Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Results.Unauthorized();
            }
        });

        group.MapPost("/refresh", async (
            RefreshTokenRequest request,
            IAuthService authService,
            CancellationToken ct) =>
        {
            try
            {
                var result = await authService.RefreshAsync(request.RefreshToken, ct);
                return Results.Ok(result);
            }
            catch (UnauthorizedAccessException)
            {
                return Results.Unauthorized();
            }
        });

        group.MapPost("/revoke", async (
            RefreshTokenRequest request,
            IAuthService authService,
            CancellationToken ct) =>
        {
            await authService.RevokeAsync(request.RefreshToken, ct);
            return Results.NoContent();
        }).RequireAuthorization();
    }
}