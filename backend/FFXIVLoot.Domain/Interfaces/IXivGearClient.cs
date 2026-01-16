using FFXIVLoot.Domain.Entities;

namespace FFXIVLoot.Domain.Interfaces;

/// <summary>
/// Client interface for interacting with the xivgear API
/// </summary>
public interface IXivGearClient
{
    /// <summary>
    /// Imports a best-in-slot list from a xivgear link
    /// </summary>
    /// <param name="xivGearLink">The xivgear link containing the set ID</param>
    /// <returns>List of gear items extracted from the xivgear set</returns>
    Task<List<GearItem>> ImportBiSFromLinkAsync(string xivGearLink);
}

