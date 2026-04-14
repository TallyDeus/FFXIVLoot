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
    /// Combat role category for the job they are currently playing (manual, with <see cref="MainSpecBisJobAbbrev"/>).
    /// </summary>
    public Domain.Enums.BisJobCategory MainSpecBisJobCategory { get; set; } = Domain.Enums.BisJobCategory.Unknown;

    /// <summary>
    /// Job abbreviation for display (PLD, GNB, …), set manually.
    /// </summary>
    public string? MainSpecBisJobAbbrev { get; set; }

    /// <summary>
    /// Combat role category for the off-spec job.
    /// </summary>
    public Domain.Enums.BisJobCategory OffSpecBisJobCategory { get; set; } = Domain.Enums.BisJobCategory.Unknown;

    /// <summary>
    /// Job abbreviation for off spec (PLD, …), manual or from import.
    /// </summary>
    public string? OffSpecBisJobAbbrev { get; set; }

    /// <summary>
    /// Link to the xivgear best-in-slot list for this member's off spec
    /// </summary>
    public string? OffSpecXivGearLink { get; set; }

    /// <summary>
    /// When true, off-spec uses synthetic raid coffer + tomestone ring slots instead of a XivGear link.
    /// </summary>
    public bool OffSpecFullCofferSet { get; set; }

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

    /// <summary>
    /// When false, hidden from BiS tracker (managers/administrators can toggle).
    /// </summary>
    public bool IsActive { get; set; } = true;
}

