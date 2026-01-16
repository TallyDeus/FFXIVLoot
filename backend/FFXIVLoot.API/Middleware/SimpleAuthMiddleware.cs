using System.Security.Cryptography;
using System.Text;

namespace FFXIVLoot.API.Middleware;

/// <summary>
/// Simple password-based authentication middleware
/// </summary>
public class SimpleAuthMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IConfiguration _configuration;
    private readonly ILogger<SimpleAuthMiddleware> _logger;

    /// <summary>
    /// Initializes a new instance of SimpleAuthMiddleware
    /// </summary>
    public SimpleAuthMiddleware(RequestDelegate next, IConfiguration configuration, ILogger<SimpleAuthMiddleware> logger)
    {
        _next = next;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Processes the HTTP request and validates authentication
    /// </summary>
    public async Task InvokeAsync(HttpContext context)
    {
        // Skip authentication for Swagger/OpenAPI endpoints
        if (context.Request.Path.StartsWithSegments("/swagger") ||
            context.Request.Path.StartsWithSegments("/api/openapi"))
        {
            await _next(context);
            return;
        }

        // Check for password in Authorization header or query parameter
        var password = context.Request.Headers["X-Password"].FirstOrDefault() 
                    ?? context.Request.Query["password"].FirstOrDefault();

        var configuredPasswordHash = _configuration["Authentication:PasswordHash"];
        
        if (string.IsNullOrEmpty(configuredPasswordHash))
        {
            // No password configured, allow access
            await _next(context);
            return;
        }

        if (string.IsNullOrEmpty(password))
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsync("Unauthorized: Password required");
            return;
        }

        // Verify password hash
        var passwordHash = ComputeSha256Hash(password);
        if (passwordHash != configuredPasswordHash)
        {
            _logger.LogWarning("Authentication failed from {RemoteIpAddress}", context.Connection.RemoteIpAddress);
            context.Response.StatusCode = 401;
            await context.Response.WriteAsync("Unauthorized: Invalid password");
            return;
        }

        await _next(context);
    }

    /// <summary>
    /// Computes SHA256 hash of a string
    /// </summary>
    private static string ComputeSha256Hash(string rawData)
    {
        using var sha256Hash = SHA256.Create();
        var bytes = sha256Hash.ComputeHash(Encoding.UTF8.GetBytes(rawData));
        var builder = new StringBuilder();
        foreach (var t in bytes)
        {
            builder.Append(t.ToString("x2"));
        }
        return builder.ToString();
    }
}

