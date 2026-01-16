using FFXIVLoot.Domain.Entities;
using FFXIVLoot.Domain.Enums;

namespace FFXIVLoot.Application.Helpers;

/// <summary>
/// Helper class for managing member link state dictionaries
/// Centralizes link state management logic to reduce duplication
/// </summary>
public static class MemberLinkStateHelper
{
    /// <summary>
    /// Gets the appropriate link states dictionary for a spec type
    /// </summary>
    public static Dictionary<string, Dictionary<GearSlot, (bool IsAcquired, bool UpgradeMaterialAcquired)>> GetLinkStates(
        Member member,
        SpecType specType)
    {
        return specType == SpecType.OffSpec
            ? (member.OffSpecLinkStates ??= new Dictionary<string, Dictionary<GearSlot, (bool, bool)>>())
            : (member.MainSpecLinkStates ??= new Dictionary<string, Dictionary<GearSlot, (bool, bool)>>());
    }

    /// <summary>
    /// Gets the current xivgear link for a spec type
    /// </summary>
    public static string? GetCurrentLink(Member member, SpecType specType)
    {
        return specType == SpecType.OffSpec ? member.OffSpecXivGearLink : member.XivGearLink;
    }

    /// <summary>
    /// Gets the appropriate BiS items list for a spec type
    /// </summary>
    public static List<GearItem> GetBisItems(Member member, SpecType specType)
    {
        return specType == SpecType.OffSpec ? member.OffSpecBisItems : member.BisItems;
    }

    /// <summary>
    /// Updates the link state for a specific slot
    /// </summary>
    public static void UpdateLinkState(
        Member member,
        SpecType specType,
        string link,
        GearSlot slot,
        bool isAcquired,
        bool upgradeMaterialAcquired)
    {
        if (string.IsNullOrEmpty(link))
            return;

        var linkStates = GetLinkStates(member, specType);
        
        if (!linkStates.ContainsKey(link))
        {
            linkStates[link] = new Dictionary<GearSlot, (bool, bool)>();
        }
        
        linkStates[link][slot] = (isAcquired, upgradeMaterialAcquired);
    }

    /// <summary>
    /// Updates the link state from the current item state
    /// </summary>
    public static void UpdateLinkStateFromItem(
        Member member,
        SpecType specType,
        GearSlot slot)
    {
        var currentLink = GetCurrentLink(member, specType);
        if (string.IsNullOrEmpty(currentLink))
            return;

        var itemsList = GetBisItems(member, specType);
        var item = itemsList.FirstOrDefault(i => i.Slot == slot);
        if (item == null)
            return;

        UpdateLinkState(member, specType, currentLink, slot, item.IsAcquired, item.UpgradeMaterialAcquired);
    }

    /// <summary>
    /// Restores acquisition state from link states if available
    /// </summary>
    public static void RestoreStateFromLink(
        Member member,
        SpecType specType,
        string link,
        List<GearItem> gearItems)
    {
        var linkStates = GetLinkStates(member, specType);
        
        if (!linkStates.TryGetValue(link, out var savedState))
            return;

        foreach (var gearItem in gearItems)
        {
            if (savedState.TryGetValue(gearItem.Slot, out var state))
            {
                gearItem.IsAcquired = state.IsAcquired;
                gearItem.UpgradeMaterialAcquired = state.UpgradeMaterialAcquired;
            }
        }
    }

    /// <summary>
    /// Saves the current state of all items to the link states dictionary
    /// </summary>
    public static void SaveCurrentStateToLink(
        Member member,
        SpecType specType,
        string link)
    {
        if (string.IsNullOrEmpty(link))
            return;

        var itemsList = GetBisItems(member, specType);
        var linkStates = GetLinkStates(member, specType);
        
        if (!linkStates.ContainsKey(link))
        {
            linkStates[link] = new Dictionary<GearSlot, (bool, bool)>();
        }

        foreach (var item in itemsList)
        {
            linkStates[link][item.Slot] = (item.IsAcquired, item.UpgradeMaterialAcquired);
        }
    }
}

