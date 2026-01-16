using FFXIVLoot.Domain.Enums;

namespace FFXIVLoot.Application.DTOs;

/// <summary>
/// Data transfer object for a gear item
/// </summary>
public class GearItemDto
{
    /// <summary>
    /// Unique identifier for the gear item
    /// </summary>
    public Guid Id { get; set; }

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

