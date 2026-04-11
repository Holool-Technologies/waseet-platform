namespace Application.Features.Auth.DTOs;

public record RegisterRequest(
    string Email,
    string Password,
    int Role  // 1 = Client, 2 = Freelancer
);

public record LoginRequest(
    string Email,
    string Password
);

public record RefreshTokenRequest(
    string RefreshToken
);

public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt,
    Guid UserId,
    int Role
);