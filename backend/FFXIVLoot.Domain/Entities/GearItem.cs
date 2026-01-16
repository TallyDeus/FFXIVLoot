using FFXIVLoot.Domain.Enums;

namespace FFXIVLoot.Domain.Entities;

/// <summary>
/// Represents an individual gear piece in a member's best-in-slot list
/// </summary>
public class GearItem
{
    /// <summary>
    /// Unique identifier for the gear item
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// The gear slot this item occupies
    /// </summary>
    public GearSlot Slot { get; set; }

    /// <summary>
    /// Name of the item
    /// </summary>
    public string ItemName { get; set; } = string.Empty;

    /// <summary>
    /// Type of item (Raid or Augmented Tome)
    /// </summary>
    public ItemType ItemType { get; set; }

    /// <summary>
    /// Whether the member has acquired this item
    /// </summary>
    public bool IsAcquired { get; set; }

    /// <summary>
    /// Whether the upgrade material has been acquired (only relevant for AugTome items)
    /// </summary>
    public bool UpgradeMaterialAcquired { get; set; }
}

