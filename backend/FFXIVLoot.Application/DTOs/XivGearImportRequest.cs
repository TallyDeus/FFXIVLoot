using FFXIVLoot.Domain.Enums;

namespace FFXIVLoot.Application.DTOs;

/// <summary>
/// Request to import a best-in-slot list from xivgear
/// </summary>
public class XivGearImportRequest
{
    /// <summary>
    /// The member ID to import BiS for
    /// </summary>
    public Guid MemberId { get; set; }

    /// <summary>
    /// The xivgear link containing the set ID
    /// </summary>
    public string XivGearLink { get; set; } = string.Empty;

    /// <summary>
    /// Whether this is for main spec or off spec
    /// </summary>
    public SpecType SpecType { get; set; } = SpecType.MainSpec;
}

