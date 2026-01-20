namespace FFXIVLoot.Application.DTOs;

/// <summary>
/// Request DTO for updating PIN
/// </summary>
public class UpdatePinRequestDto
{
    /// <summary>
    /// Current PIN
    /// </summary>
    public string CurrentPin { get; set; } = string.Empty;

    /// <summary>
    /// New PIN
    /// </summary>
    public string NewPin { get; set; } = string.Empty;
}




