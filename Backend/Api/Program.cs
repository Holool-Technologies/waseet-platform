using Api.Endpoints;
using Api.Hubs;
using Api.Middleware;
using Application;
using Infrastructure;
using Infrastructure.Persistence;
using Microsoft.OpenApi.Models;
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);

builder.Services.AddSignalR();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Waseet API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new()
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter your JWT token"
    });
    c.AddSecurityRequirement(new()
    {
        {
            new() { Reference = new() { Type = ReferenceType.SecurityScheme, Id = "Bearer" } },
            Array.Empty<string>()
        }
    });
});

var allowedOrigins = builder.Configuration
    .GetSection("AllowedOrigins")
    .Get<string[]>() ?? [];

builder.Services.AddCors(options =>
{
    options.AddPolicy("WaseetCors", policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

//builder.Services.AddCors(options =>
//{
//    options.AddPolicy("WaseetCors", policy =>
//        policy.WithOrigins("http://localhost:4200")
//              .AllowAnyHeader()
//              .AllowAnyMethod()
//              .AllowCredentials());
//});
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = builder.Environment.IsDevelopment();
    options.MaximumReceiveMessageSize = 32 * 1024; // 32KB max message
    options.ClientTimeoutInterval = TimeSpan.FromSeconds(60);
    options.KeepAliveInterval = TimeSpan.FromSeconds(15);
});

// Fix timezone: serialize DateTime as UTC ISO 8601
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new UtcDateTimeConverter());
});
var app = builder.Build();
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<WaseetDbContext>();
    await WaseetDbSeeder.SeedAsync(db);
}
app.UseMiddleware<ExceptionMiddleware>();

app.UseCors("WaseetCors");
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapAuthEndpoints();
app.MapTaskEndpoints();
app.MapEscrowEndpoints();
app.MapChatEndpoints();
app.MapKycEndpoints();
app.MapAdminEndpoints();
app.MapProfileEndpoints();
app.MapNotificationEndpoints();
app.MapFileEndpoints();
// Replace old ChatHub with unified hub:
app.MapHub<WaseetHub>("/hubs/waseet");
//app.MapHub<ChatHub>("/hubs/chat");

app.UseStaticFiles();
app.Run();