using FFXIVLoot.Domain.Entities;

namespace FFXIVLoot.Application.Helpers;

/// <summary>
/// Helper class for GearItem operations
/// Centralizes deep copying logic to reduce duplication
/// </summary>
public static class GearItemHelper
{
    /// <summary>
    /// Creates a deep copy of a GearItem
    /// </summary>
    public static GearItem DeepCopy(GearItem item)
    {
        if (item == null)
        {
            throw new ArgumentNullException(nameof(item));
        }

        return new GearItem
        {
            Id = item.Id,
            Slot = item.Slot,
            ItemName = item.ItemName,
            ItemType = item.ItemType,
            IsAcquired = item.IsAcquired,
            UpgradeMaterialAcquired = item.UpgradeMaterialAcquired
        };
    }

    /// <summary>
    /// Creates a deep copy of a list of GearItems
    /// </summary>
    public static List<GearItem> DeepCopyList(IEnumerable<GearItem> items)
    {
        if (items == null)
        {
            return new List<GearItem>();
        }

        return items.Select(DeepCopy).ToList();
    }
}

