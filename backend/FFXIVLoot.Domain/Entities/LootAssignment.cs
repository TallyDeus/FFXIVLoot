using FFXIVLoot.Domain.Enums;

namespace FFXIVLoot.Domain.Entities;

/// <summary>
/// Represents a loot assignment for a specific week
/// </summary>
public class LootAssignment
{
    /// <summary>
    /// Unique identifier for the assignment
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Week number this assignment belongs to
    /// </summary>
    public int WeekNumber { get; set; }

    /// <summary>
    /// Floor number where the loot was assigned
    /// </summary>
    public FloorNumber FloorNumber { get; set; }

    /// <summary>
    /// Member ID who received the loot
    /// </summary>
    public Guid MemberId { get; set; }

    /// <summary>
    /// Gear slot (null if this is an upgrade material)
    /// </summary>
    public GearSlot? Slot { get; set; }

    /// <summary>
    /// Whether this is an upgrade material assignment
    /// </summary>
    public bool IsUpgradeMaterial { get; set; }

    /// <summary>
    /// Whether this is an armor upgrade material (only relevant if IsUpgradeMaterial is true)
    /// </summary>
    public bool IsArmorMaterial { get; set; }

    /// <summary>
    /// Timestamp when the assignment was made
    /// </summary>
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Whether this assignment has been undone
    /// </summary>
    public bool IsUndone { get; set; }

    /// <summary>
    /// Whether this assignment was for main spec or off spec
    /// </summary>
    public SpecType SpecType { get; set; } = SpecType.MainSpec;

    /// <summary>
    /// Whether this is a manual edit from the BiS tracker (not from loot distribution)
    /// </summary>
    public bool IsManualEdit { get; set; }

    /// <summary>
    /// Item type (Raid or AugTome) - used for manual edits to determine correct tag display
    /// </summary>
    public ItemType? ItemType { get; set; }
}

