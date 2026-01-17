namespace FFXIVLoot.Application.DTOs;

/// <summary>
/// Response DTO for successful login
/// </summary>
public class LoginResponseDto
{
    /// <summary>
    /// Member information
    /// </summary>
    public MemberDto Member { get; set; } = null!;

    /// <summary>
    /// Authentication token (session identifier)
    /// </summary>
    public string Token { get; set; } = string.Empty;
}



