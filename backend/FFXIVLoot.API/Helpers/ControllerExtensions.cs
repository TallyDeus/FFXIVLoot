using FFXIVLoot.Application.Interfaces;
using FFXIVLoot.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace FFXIVLoot.API.Helpers;

/// <summary>
/// Extension methods for controllers to get the current authenticated user
/// </summary>
public static class ControllerExtensions
{
    /// <summary>
    /// Gets the current authenticated member from the request token
    /// </summary>
    public static async Task<Member?> GetCurrentUserAsync(this ControllerBase controller, IAuthenticationService authService)
    {
        var authHeader = controller.Request.Headers["Authorization"].FirstOrDefault();
        if (string.IsNullOrEmpty(authHeader))
        {
            return null;
        }
        
        // Handle both "Bearer token" and just "token" formats
        var token = authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
            ? authHeader.Substring(7)
            : authHeader;
        
        if (string.IsNullOrEmpty(token))
        {
            return null;
        }
            
        return await authService.GetMemberFromTokenAsync(token);
    }
}

