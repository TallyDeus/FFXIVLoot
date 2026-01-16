using FFXIVLoot.Application.DTOs;

namespace FFXIVLoot.Application.Interfaces;

/// <summary>
/// Service interface for authentication
/// </summary>
public interface IAuthenticationService
{
    /// <summary>
    /// Authenticates a user with member name and PIN
    /// </summary>
    Task<LoginResponseDto?> LoginAsync(LoginRequestDto request);

    /// <summary>
    /// Validates a session token and returns the member ID
    /// </summary>
    Guid? ValidateToken(string? token);

    /// <summary>
    /// Logs out a user by invalidating their token
    /// </summary>
    void Logout(string token);

    /// <summary>
    /// Gets the member associated with a token
    /// </summary>
    Task<Domain.Entities.Member?> GetMemberFromTokenAsync(string? token);
}


