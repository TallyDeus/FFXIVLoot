namespace FFXIVLoot.Domain.Entities;

/// <summary>
/// Represents a raid group member with their best-in-slot list
/// </summary>
public class Member
{
    /// <summary>
    /// Unique identifier for the member
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Name of the raid member
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Role of the raid member (DPS or Support)
    /// </summary>
    public Enums.MemberRole Role { get; set; } = Enums.MemberRole.DPS;

    /// <summary>
    /// Link to the xivgear best-in-slot list for this member (main spec)
    /// </summary>
    public string? XivGearLink { get; set; }

    /// <summary>
    /// List of best-in-slot gear items for this member (main spec)
    /// </summary>
    public List<GearItem> BisItems { get; set; } = new();

    /// <summary>
    /// Combat role category for the job they are currently playing (set manually with <see cref="MainSpecBisJobAbbrev"/>).
    /// </summary>
    public Enums.BisJobCategory MainSpecBisJobCategory { get; set; } = Enums.BisJobCategory.Unknown;

    /// <summary>
    /// Job abbreviation for display (e.g. PLD), set manually on the member profile.
    /// </summary>
    public string? MainSpecBisJobAbbrev { get; set; }

    /// <summary>
    /// Combat role category for the off-spec job (manual or set from XivGear import).
    /// </summary>
    public Enums.BisJobCategory OffSpecBisJobCategory { get; set; } = Enums.BisJobCategory.Unknown;

    /// <summary>
    /// Job abbreviation for off spec (e.g. PLD), manual or from import.
    /// </summary>
    public string? OffSpecBisJobAbbrev { get; set; }

    /// <summary>
    /// Link to the xivgear best-in-slot list for this member's off spec
    /// </summary>
    public string? OffSpecXivGearLink { get; set; }

    /// <summary>
    /// When true, off-spec BiS is tracked as a full set of raid coffers (plus one tomestone ring) instead of a XivGear link.
    /// </summary>
    public bool OffSpecFullCofferSet { get; set; }

    /// <summary>
    /// List of best-in-slot gear items for this member's off spec
    /// </summary>
    public List<GearItem> OffSpecBisItems { get; set; } = new();

    /// <summary>
    /// Stores acquisition state per xivgear link for main spec
    /// Key: xivgear link, Value: Dictionary of slot -> (IsAcquired, UpgradeMaterialAcquired)
    /// </summary>
    public Dictionary<string, Dictionary<Enums.GearSlot, (bool IsAcquired, bool UpgradeMaterialAcquired)>> MainSpecLinkStates { get; set; } = new();

    /// <summary>
    /// Stores acquisition state per xivgear link for off spec
    /// Key: xivgear link, Value: Dictionary of slot -> (IsAcquired, UpgradeMaterialAcquired)
    /// </summary>
    public Dictionary<string, Dictionary<Enums.GearSlot, (bool IsAcquired, bool UpgradeMaterialAcquired)>> OffSpecLinkStates { get; set; } = new();

    /// <summary>
    /// Permission role for this member (User, Manager, Administrator)
    /// </summary>
    public Enums.PermissionRole PermissionRole { get; set; } = Enums.PermissionRole.User;

    /// <summary>
    /// 4-digit PIN code for authentication (stored as hash)
    /// </summary>
    public string? PinHash { get; set; }

    /// <summary>
    /// URL path to the member's profile image
    /// </summary>
    public string? ProfileImageUrl { get; set; }

    /// <summary>
    /// When false, hidden from BiS tracker (managers can toggle).
    /// </summary>
    public bool IsActive { get; set; } = true;
}


