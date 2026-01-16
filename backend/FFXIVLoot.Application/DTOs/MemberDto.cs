namespace FFXIVLoot.Application.DTOs;

/// <summary>
/// Data transfer object for a raid member
/// </summary>
public class MemberDto
{
    /// <summary>
    /// Unique identifier for the member
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Name of the raid member
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Role of the raid member (DPS or Support)
    /// </summary>
    public Domain.Enums.MemberRole Role { get; set; } = Domain.Enums.MemberRole.DPS;

    /// <summary>
    /// Link to the xivgear best-in-slot list for this member (main spec)
    /// </summary>
    public string? XivGearLink { get; set; }

    /// <summary>
    /// List of best-in-slot gear items for this member (main spec)
    /// </summary>
    public List<GearItemDto> BisItems { get; set; } = new();

    /// <summary>
    /// Link to the xivgear best-in-slot list for this member's off spec
    /// </summary>
    public string? OffSpecXivGearLink { get; set; }

    /// <summary>
    /// List of best-in-slot gear items for this member's off spec
    /// </summary>
    public List<GearItemDto> OffSpecBisItems { get; set; } = new();

    /// <summary>
    /// Permission role for this member (User, Manager, Administrator)
    /// </summary>
    public Domain.Enums.PermissionRole PermissionRole { get; set; } = Domain.Enums.PermissionRole.User;

    /// <summary>
    /// URL path to the member's profile image
    /// </summary>
    public string? ProfileImageUrl { get; set; }
}

