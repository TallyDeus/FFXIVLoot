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
    /// Link to the xivgear best-in-slot list for this member's off spec
    /// </summary>
    public string? OffSpecXivGearLink { get; set; }

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
}

