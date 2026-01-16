using FFXIVLoot.Application.Services;
using FFXIVLoot.Application.Interfaces;
using FFXIVLoot.Domain.Interfaces;
using FFXIVLoot.Infrastructure.Repositories;
using FFXIVLoot.Infrastructure.XivGear;
using FFXIVLoot.API.Middleware;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure CORS for React frontend
// Read allowed origins from environment variable (comma-separated)
// Default to localhost:3000 for development
var corsOrigins = builder.Configuration["CORS_ORIGINS"] ?? "http://localhost:3000";
var allowedOrigins = corsOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries)
    .Select(origin => origin.Trim())
    .ToArray();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials()
              .SetPreflightMaxAge(TimeSpan.FromSeconds(86400)); // Cache preflight for 24 hours
    });
});

// Register domain interfaces and implementations
builder.Services.AddScoped<IMemberRepository, JsonMemberRepository>();
builder.Services.AddScoped<IWeekRepository, JsonWeekRepository>();
builder.Services.AddScoped<ILootAssignmentRepository, JsonLootAssignmentRepository>();
builder.Services.AddHttpClient<IXivGearClient, XivGearClient>();

// Register application services via interfaces (dependency inversion)
// AuthenticationService must be Singleton to persist sessions across requests
// Uses IServiceScopeFactory to access scoped services (IMemberRepository)
builder.Services.AddSingleton<IAuthenticationService, AuthenticationService>();
builder.Services.AddScoped<IMemberService, MemberService>();
builder.Services.AddScoped<IBiSService, BiSService>();
builder.Services.AddScoped<IWeekService, WeekService>();
builder.Services.AddScoped<IWeekDeletionService, WeekDeletionService>();
builder.Services.AddScoped<ILootDistributionService, LootDistributionService>();
builder.Services.AddScoped<ILootHistoryService, LootHistoryService>();

// Register infrastructure services
builder.Services.AddScoped<FFXIVLoot.Infrastructure.Initialization.DataInitializer>();
builder.Services.AddScoped<FFXIVLoot.Infrastructure.Initialization.WeekDataInitializer>();

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Enable CORS FIRST - must be before other middleware
// CORS must be before UseRouting and UseEndpoints
app.UseCors("AllowReactApp");

// Only use HTTPS redirection in production
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// Simple password authentication middleware (optional - can be enabled via configuration)
var enableAuth = builder.Configuration.GetValue<bool>("Authentication:Enabled", false);
if (enableAuth)
{
    app.UseMiddleware<SimpleAuthMiddleware>();
}

app.UseAuthorization();

// Map controllers
app.MapControllers();

// Initialize default members and historical data on startup
_ = Task.Run(async () =>
{
    await Task.Delay(1000); // Wait for app to be ready
    using (var scope = app.Services.CreateScope())
    {
        var memberInitializer = scope.ServiceProvider.GetRequiredService<FFXIVLoot.Infrastructure.Initialization.DataInitializer>();
        var weekInitializer = scope.ServiceProvider.GetRequiredService<FFXIVLoot.Infrastructure.Initialization.WeekDataInitializer>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        try
        {
            await memberInitializer.InitializeDefaultMembersAsync();
            logger.LogInformation("Default members initialized successfully");
            
            await weekInitializer.InitializeHistoricalDataAsync();
            logger.LogInformation("Historical week data initialized successfully");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error initializing data on startup");
        }
    }
});

// Configure port from environment variable (Render provides PORT)
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(port) && int.TryParse(port, out var portNumber))
{
    app.Urls.Add($"http://0.0.0.0:{portNumber}");
}

app.Run();
