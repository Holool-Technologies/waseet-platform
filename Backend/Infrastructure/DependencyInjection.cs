using Application.Features.Admin.Interfaces;
using Application.Features.Auth.Interfaces;
using Application.Features.Chat.Interfaces;
using Application.Features.Kyc.Interfaces;
using Application.Features.Notifications.Interfaces;
using Domain.Interfaces;
using Infrastructure.Persistence;
using Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Waseet.Application.Features.Tasks.Interfaces;


namespace Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddDbContext<WaseetDbContext>(options =>
            options.UseSqlServer(
                configuration.GetConnectionString("WaseetDb"),
                sql => sql.MigrationsAssembly(typeof(WaseetDbContext).Assembly.FullName)
            ));

        services.Configure<JwtSettings>(
            configuration.GetSection("JwtSettings"));

        services.AddScoped<IAuthService, AuthService>();
	    services.AddScoped<IKycService, KycService>();
	    services.AddSingleton<EncryptionService>();
    	services.AddSingleton<IFileStorageService, LocalFileStorageService>();
        services.AddScoped<TaskCodeGenerator>();
        services.AddScoped<ITaskService, TaskService>();
        services.AddScoped<IChatService, ChatService>();
        services.AddSingleton<IAiSanitizerService, AiSanitizerService>();
        // Add HttpClient for Resend
        services.AddHttpClient("Resend");
	    services.AddScoped<IEmailService, ResendEmailService>();
        services.AddScoped<IAdminService, AdminService>();
        services.AddSingleton<IVisionService, AzureVisionService>();
        services.AddSingleton<BioFilterService>();
        services.AddScoped<ProfileService>();
        services.AddScoped<INotificationService, NotificationService>();

        var jwtSettings = configuration.GetSection("JwtSettings").Get<JwtSettings>()!;
        var key = Encoding.UTF8.GetBytes(jwtSettings.SecretKey);

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwtSettings.Issuer,
                ValidAudience = jwtSettings.Audience,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ClockSkew = TimeSpan.Zero
            };

            // Allow SignalR to read JWT from query string
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    var accessToken = context.Request.Query["access_token"];
                    var path = context.HttpContext.Request.Path;
                    if (!string.IsNullOrEmpty(accessToken) &&
                        path.StartsWithSegments("/hubs"))
                    {
                        context.Token = accessToken;
                    }
                    return Task.CompletedTask;
                }
            };
	   options.MapInboundClaims = false;
        });

        services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireClaim("role", "Admin"));
});
        return services;
    }
}