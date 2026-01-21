using FFXIVLoot.Application.Services;
using FFXIVLoot.Application.Interfaces;
using FFXIVLoot.Domain.Interfaces;
using FFXIVLoot.Infrastructure.Repositories;
using FFXIVLoot.Infrastructure.XivGear;
using FFXIVLoot.API.Middleware;
using FFXIVLoot.API.Hubs;
using FFXIVLoot.API.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

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
              .SetPreflightMaxAge(TimeSpan.FromSeconds(86400));
    });
});

builder.Services.AddScoped<IMemberRepository, JsonMemberRepository>();
builder.Services.AddScoped<IWeekRepository, JsonWeekRepository>();
builder.Services.AddScoped<ILootAssignmentRepository, JsonLootAssignmentRepository>();
builder.Services.AddHttpClient<IXivGearClient, XivGearClient>();

builder.Services.AddSingleton<IAuthenticationService, AuthenticationService>();
builder.Services.AddScoped<IMemberService, MemberService>();
builder.Services.AddScoped<IBiSService, BiSService>();
builder.Services.AddScoped<IWeekService, WeekService>();
builder.Services.AddScoped<IWeekDeletionService, WeekDeletionService>();
builder.Services.AddScoped<ILootDistributionService, LootDistributionService>();
builder.Services.AddScoped<ILootHistoryService, LootHistoryService>();

// Add SignalR for real-time updates
builder.Services.AddSignalR();
builder.Services.AddSingleton<IUpdatesBroadcaster, SignalRUpdatesBroadcaster>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowReactApp");

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

var enableAuth = builder.Configuration.GetValue<bool>("Authentication:Enabled", false);
if (enableAuth)
{
    app.UseMiddleware<SimpleAuthMiddleware>();
}

app.UseAuthorization();

var imagesPath = Path.Combine(Directory.GetCurrentDirectory(), "data", "images");
if (!Directory.Exists(imagesPath))
{
    Directory.CreateDirectory(imagesPath);
}
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(imagesPath),
    RequestPath = "/images"
});

app.MapControllers();
app.MapHub<UpdatesHub>("/hubs/updates");

var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(port) && int.TryParse(port, out var portNumber))
{
    app.Urls.Add($"http://0.0.0.0:{portNumber}");
}

app.Run();
