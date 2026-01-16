using FFXIVLoot.Domain.Enums;

namespace FFXIVLoot.Domain.Entities;

/// <summary>
/// Represents a floor in a savage raid tier and its associated loot
/// </summary>
public class LootFloor
{
    /// <summary>
    /// The floor number (1-4)
    /// </summary>
    public FloorNumber FloorNumber { get; set; }

    /// <summary>
    /// Gear slots that drop from this floor
    /// </summary>
    public List<GearSlot> GearSlots { get; set; } = new();

    /// <summary>
    /// Whether this floor drops accessory upgrade materials
    /// </summary>
    public bool DropsAccessoryUpgradeMaterial { get; set; }

    /// <summary>
    /// Whether this floor drops armor upgrade materials
    /// </summary>
    public bool DropsArmorUpgradeMaterial { get; set; }
}

