namespace FFXIVLoot.Application.DTOs;

/// <summary>
/// Request DTO for user login
/// </summary>
public class LoginRequestDto
{
    /// <summary>
    /// Member name (username)
    /// </summary>
    public string MemberName { get; set; } = string.Empty;

    /// <summary>
    /// 4-digit PIN code
    /// </summary>
    public string Pin { get; set; } = string.Empty;
}




