using FFXIVLoot.Domain.Entities;
using FFXIVLoot.Domain.Enums;

namespace FFXIVLoot.Application.Helpers;

/// <summary>
/// Builds and maintains the synthetic off-spec BiS list for "full set of coffers" mode:
/// one raid piece per slot, with one ring as augmented tomestone (+ upgrade material).
/// </summary>
public static class OffSpecCofferHelper
{
    /// <summary>
    /// Left ring uses tomestone; right ring uses raid coffer (matches common gearing patterns).
    /// </summary>
    internal static readonly (GearSlot Slot, ItemType Type, string Name)[] Template =
    [
        (GearSlot.Weapon, ItemType.Raid, "Raid piece"),
        (GearSlot.Head, ItemType.Raid, "Raid piece"),
        (GearSlot.Body, ItemType.Raid, "Raid piece"),
        (GearSlot.Hand, ItemType.Raid, "Raid piece"),
        (GearSlot.Legs, ItemType.Raid, "Raid piece"),
        (GearSlot.Feet, ItemType.Raid, "Raid piece"),
        (GearSlot.Ears, ItemType.Raid, "Raid piece"),
        (GearSlot.Neck, ItemType.Raid, "Raid piece"),
        (GearSlot.Wrist, ItemType.Raid, "Raid piece"),
        (GearSlot.RightRing, ItemType.Raid, "Raid piece"),
        (GearSlot.LeftRing, ItemType.AugTome, "Tomestone ring"),
    ];

    public static bool NeedsInitialization(Member member)
    {
        if (member.OffSpecBisItems == null || member.OffSpecBisItems.Count != Template.Length)
            return true;

        var bySlot = member.OffSpecBisItems.GroupBy(i => i.Slot).ToDictionary(g => g.Key, g => g.First());
        foreach (var (slot, type, _) in Template)
        {
            if (!bySlot.TryGetValue(slot, out var item) || item.ItemType != type)
                return true;
        }

        return false;
    }

    public static void EnsureOffSpecCofferItems(Member member, Member? existingMember)
    {
        var sourceItems = existingMember?.OffSpecBisItems ?? member.OffSpecBisItems ?? new List<GearItem>();
        var existingBySlot = sourceItems.GroupBy(i => i.Slot).ToDictionary(g => g.Key, g => g.First());

        member.OffSpecBisItems = Template.Select(t =>
        {
            if (existingBySlot.TryGetValue(t.Slot, out var old) && old.ItemType == t.Type)
            {
                return new GearItem
                {
                    Id = old.Id,
                    Slot = t.Slot,
                    ItemName = t.Name,
                    ItemType = t.Type,
                    IsAcquired = old.IsAcquired,
                    UpgradeMaterialAcquired = old.UpgradeMaterialAcquired
                };
            }

            return new GearItem
            {
                Slot = t.Slot,
                ItemName = t.Name,
                ItemType = t.Type,
                IsAcquired = false,
                UpgradeMaterialAcquired = false
            };
        }).ToList();
    }
}
