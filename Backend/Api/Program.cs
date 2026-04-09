using Infrastructure;
using Application;

var builder = WebApplication.CreateBuilder(args);

//builder.Services.AddApplicationServices();      // wired in Phase 2
//builder.Services.AddInfrastructureServices(builder.Configuration); // wired in Phase 2

builder.Services.AddSignalR();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddPolicy("WaseetCors", policy =>
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

var app = builder.Build();

app.UseCors("WaseetCors");
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Endpoints and Hubs registered here in later phases
// app.MapHub<ChatHub>("/hubs/chat");

app.Run();