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
            catch (UnauthorizedAccessException)
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

        // Forgot password
        group.MapPost("/forgot-password", async (
            ForgotPasswordRequest request,
            IAuthService authService,
            CancellationToken ct) =>
        {
            await authService.ForgotPasswordAsync(request.Email, ct);
            // Always 200 — never reveal if email exists
            return Results.Ok(new { message = "If that email exists, a reset link has been sent." });
        });

        // Reset password
        group.MapPost("/reset-password", async (
            ResetPasswordRequest request,
            IAuthService authService,
            CancellationToken ct) =>
        {
            try
            {
                await authService.ResetPasswordAsync(request.Token, request.NewPassword, ct);
                return Results.Ok(new { message = "Password reset successfully." });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { message = ex.Message });
            }
        });

        // Google login
        group.MapPost("/login/google", async (
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
                // Return specific error code so frontend can display the right message
                var code = ex.Message.Contains("not found") ? "EMAIL_NOT_FOUND" : "WRONG_PASSWORD";
                return Results.Json(
                    new { code, message = ex.Message },
                    statusCode: 401);
            }
        });

    }
}

