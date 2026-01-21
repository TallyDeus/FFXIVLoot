using FFXIVLoot.Domain.Enums;

namespace FFXIVLoot.Application.DTOs;

using FFXIVLoot.Domain.Enums;

/// <summary>
/// Data transfer object for loot assignment request
/// </summary>
public class LootAssignmentRequestDto
{
    /// <summary>
    /// The member ID to assign loot to
    /// </summary>
    public Guid MemberId { get; set; }

    /// <summary>
    /// The gear slot of the item to assign
    /// </summary>
    public GearSlot Slot { get; set; }

    /// <summary>
    /// The floor number where the loot is being assigned
    /// </summary>
    public int FloorNumber { get; set; }

    /// <summary>
    /// Whether this is for main spec or off spec
    /// </summary>
    public SpecType SpecType { get; set; } = SpecType.MainSpec;
}

/// <summary>
/// Data transfer object for upgrade material assignment request
/// </summary>
public class UpgradeMaterialAssignmentRequestDto
{
    /// <summary>
    /// The member ID to assign upgrade material to
    /// </summary>
    public Guid MemberId { get; set; }

    /// <summary>
    /// Whether this is an armor upgrade material (true) or accessory upgrade material (false)
    /// </summary>
    public bool IsArmorMaterial { get; set; }

    /// <summary>
    /// The floor number where the upgrade material is being assigned
    /// </summary>
    public int FloorNumber { get; set; }

    /// <summary>
    /// Whether this is for main spec or off spec
    /// </summary>
    public SpecType SpecType { get; set; } = SpecType.MainSpec;
}

/// <summary>
/// Data transfer object for available loot and eligible members
/// </summary>
public class AvailableLootDto
{
    /// <summary>
    /// The gear slot (null if this is an upgrade material)
    /// </summary>
    public GearSlot? Slot { get; set; }

    /// <summary>
    /// Whether this is an upgrade material (true) or regular gear (false)
    /// </summary>
    public bool IsUpgradeMaterial { get; set; }

    /// <summary>
    /// Whether this is an armor upgrade material (only relevant if IsUpgradeMaterial is true)
    /// </summary>
    public bool IsArmorMaterial { get; set; }

    /// <summary>
    /// List of member IDs who need this item, with their needed counts
    /// </summary>
    public List<MemberNeedDto> EligibleMembers { get; set; } = new();

    /// <summary>
    /// Whether this item has been assigned in the current week
    /// </summary>
    public bool IsAssigned { get; set; }

    /// <summary>
    /// Member ID who received this item (if assigned)
    /// </summary>
    public Guid? AssignedToMemberId { get; set; }

    /// <summary>
    /// Assignment ID (for undo functionality)
    /// </summary>
    public Guid? AssignmentId { get; set; }
}

/// <summary>
/// Data transfer object for member needs
/// </summary>
public class MemberNeedDto
{
    /// <summary>
    /// The member ID
    /// </summary>
    public Guid MemberId { get; set; }

    /// <summary>
    /// How many of this item/material the member needs
    /// </summary>
    public int NeededCount { get; set; }

    /// <summary>
    /// Whether this need is for main spec or off spec
    /// </summary>
    public SpecType SpecType { get; set; } = SpecType.MainSpec;
}

/// <summary>
/// Data transfer object for member acquisition count (for Extra loot)
/// </summary>
public class MemberAcquisitionCountDto
{
    /// <summary>
    /// The member ID
    /// </summary>
    public Guid MemberId { get; set; }

    /// <summary>
    /// How many times this member has acquired this item as Extra
    /// </summary>
    public int Count { get; set; }
}
